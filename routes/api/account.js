'use strict';

var express = require('express');
var config = require('easy-config');

var db = require('../../lib/db')();
var Account = db.models.Account;


function findUser(req, res, next) {
    Account.find({where: {email: req.session.userId}})
        .success(function (user) {
            if(!user) {
                req.log.error({err: {message: 'Invalid session'}}, 'User lookup from db failed');
                res.send(500);
                return;
            }
            req.log = req.log.child({email: user.email});
            req.user = user;
            next();
        })
        .error(function (err) {
            if(err) {
                req.log.error({err: err}, 'User lookup from db failed');
                res.send(500);
            }
        });
}

module.exports = function () {
    var app = express.Router();

    app.get('/', findUser, function (req, res, next) {
        res.json({email: req.user.email});
    });

    app.post('/save', findUser, function (req, res, next) {

        req.log.debug('Updating user');
        if(req.body.password !== req.body.password2) {
            res.send(400, {field: 'password', message: 'Passwords do not match'});
            return;
        }
        req.user.isValidPassword(req.body.oldpassword, function (err, valid) {
            if(err) {
                req.log.error({err: err}, 'User update failed');
                res.send(500);
                return;
            }
            if(!valid) {
                res.send(400, {field: 'oldpassword', message: 'Invalid old password'});
                return;
            }
            req.user.password = req.body.password;
            req.user.save(function (saveErr) {
                if(err) {
                    req.log.error({err: saveErr}, 'User update failed');
                    res.send(500);
                    return;
                }
                res.send(200);
            });
        });
    });
    return app;
};
