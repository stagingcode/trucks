'use strict';
var nodemailer = require('nodemailer');
var express = require('express');
var config = require('easy-config');

var db = require('../../lib/db')();
var Account = db.models.Account;

var mailer = nodemailer.createTransport('SMTP', config.email.transport);

module.exports = function () {
    var app = express.Router();

    app.post('/login', function (req, res, next) {
        req.log.debug({email: req.body.email}, 'Login attempt');
        if(!req.session.isGuest()) {
            // Account logged in
            res.send(200);
            return;
        }
        if(!req.body || !req.body.email || !req.body.password) {
            next(req._httpError(400));
            return;
        }

        Account.find({where: {email: req.body.email}}).success(function (user) {
            if (!user) {
                req.log.warn({ message: 'Incorrect username.'}, 'Unsuccessful login attempt');
                next(req._httpError(406, 'Incorrect username'));
                return;
            }
            user.isValidPassword(req.body.password, function (vErr, isValid) {
                if(vErr) {
                    req.log.error({err: vErr}, 'Password validation error');
                    next(req._httpError(500));
                    return;
                }
                if(!isValid) {
                    req.log.warn({ message: 'Incorrect password.'}, 'Unsuccessful login attempt');
                    next(req._httpError(406, 'Incorrect password'));
                    return;
                }
                req.session.login(function (err) {
                    if(err) {
                        req.log.error({err: err}, 'Login failed');
                        next(req._httpError(500));
                        return;
                    }
                    req.session.userId = user.email;
                    res.send(200);
                });
            });
        }).error(function (err) {
            if(err) {
                req.log.error({err: err}, 'Account lookup error');
                next(req._httpError(500, 'Account lookup error'));
                return;
            }
        });
    });

    app.post('/register', function (req, res, next) {
        req.log.debug({email: req.body.email}, 'Register attempt');
        if(!req.body || !req.body.email || !req.body.password) {
            next(req._httpError(400));
            return;
        }
        var user = Account.build({email: req.body.email, password: req.body.password});
        user
            .save()
            .success(function (newUser) {
                req.session.login(function (err) {
                    if(err) {
                        req.log.error({err: err}, 'Error on login');
                        next(req._httpError(500, 'User registered. Error on login'));
                        return;
                    }
                    req.session.userId = newUser.email;
                    res.send(200);
                });
            })
            .error(function (err) {
                if(err) {
                    if(err.code === 1062) {
                        req.log.warn({err: err}, 'Duplicate email');
                        next(req._httpError(409, 'Username already in use'));
                        return;
                    }
                    req.log.error({err: err}, 'Unable to register user');
                    next(req._httpError(500, 'Unable to register user'));
                }
            });
    });

    app.post('/recover', function (req, res, next) {
        req.log.debug({email: req.body.email}, 'Password recovery attempt');
        Account.find({ where: {email: req.body.email}})
            .success(function (user) {
                if (!user) {
                    req.log.warn({ message: 'Incorrect email.'}, 'Unsuccessful password recovery attempt');
                    next(req._httpError(406, 'Incorrect email address'));
                    return;
                }

                var hash = Math.random().toString(36).substr(2);
                var link = req.protocol + "://" + req.get('host') + '/api/auth/hash/' + hash;
                req.redis.set('hash_' + hash, req.body.email, function (err) {
                    if(err) {
                        req.log.error({err: err}, 'Saving hash to redis failed');
                        next(req._httpError(500));
                        return;
                    }
                    var mailOptions = {
                        from: config.email.options.from, // sender address
                        to: req.body.email, // list of receivers
                        subject: 'Password recovery', // Subject line
                        text: link, // plaintext body
                        html: '<a href="' + link + '">' + link + '</a>' // html body
                    };
                    mailer.sendMail(mailOptions, function (err, response) {
                        if(err) {
                            req.log.error({err: err, email: req.body.email}, 'Unable to send email');
                            next(req._httpError(500, 'Unable to send email'));
                            return;
                        }
                        res.send(200);
                    });
                });
            })
            .error(function (err) {
                if (err) {
                    req.log.error({err: err}, 'Account lookup error');
                    next(req._httpError(500, 'Account lookup error'));
                }
            });
    });

    app.get('/hash/:hash', function (req, res, next) {
        req.log.debug({hash: req.params.hash}, 'Hash link accessed');
        var key = 'hash_' + req.params.hash;
        req.redis.get(key, function (err, email) {
            if(err) {
                req.log.error({err: err, hash: req.params.hash}, 'Unable to retrieve value from redis');
                next(req._httpError(500));
                return;
            }
            if(!email) { //Invalid hash
                req.log.warn({hash: req.params.hash}, 'Invalid hash link accessed');
                res.redirect('/');
                return;
            }
            req.redis.del(key, function (err) {
                if(err) {
                    req.log.error({err: err, hash: req.params.hash}, 'Unable to delete value from redis');
                    next(req._httpError(500));
                    return;
                }
                req.session.hashEmail = email;
                req.session.save();
                res.redirect('/set-new-password');
            });
        });
    });

    app.post('/setPassword', function (req, res, next) {
        if(!req.session.hashEmail) {
            next(req._httpError(401));
            return;
        }
        req.log.debug({email: req.session.hashEmail}, 'Save new password');
        Account.find({where: {email: req.session.hashEmail}})
            .success(function (user) {
                if(user) {
                    req.log.debug({email: req.session.hashEmail}, 'Change user password');
                    user.password = req.body.password;
                } else {
                    req.log.debug({email: req.session.hashEmail}, 'Create new user via hashlink');
                    user = Account.build({email: req.session.hashEmail, password: req.body.password});
                }
                user
                    .save()
                    .success(function (user) {
                        req.session.login(function (err) {
                            if (err) {
                                req.log.error({err: err}, 'Error on login');
                                next(req._httpError(500, 'New password was set successfully. Error on login'));
                                return;
                            }
                            req.session.userId = user.email;
                            res.json({email: user.email});
                        });
                    })
                    .error( function (err) {
                        if(err) {
                            if(err.code === 11000) {
                                req.log.warn({err: err}, 'Duplicate email');
                                next(req._httpError(409, 'Email already in use'));
                                return;
                            }
                            req.log.error({err: err}, 'Unable to save user');
                            next(req._httpError(500, 'Unable to save user'));
                            return;
                        }
                    });
            })
            .error(function (err) {
                if(err) {
                    req.log.error({err: err, email: req.session.hashEmail}, 'Unable to retrieve value from mongo');
                    next(req._httpError(500));
                    return;
                }
            });
    });

    app.get('/logout', function (req, res, next) {
        req.session.logout(function (err) {
            if(err) {
                req.log.error(err, 'Error on logout');
            }
            res.redirect('/');
        });
    });

    return app;
};