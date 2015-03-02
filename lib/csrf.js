'use strict';

var url = require('url');
var lusca = require('lusca');

var lCsrf = lusca.csrf();

module.exports = function getCsrf(opts) {
    if (typeof opts !== 'object') {
        throw new TypeError('Expected an object');
    }

    var domainData = false;
    if (opts.origin) {
        domainData = {
            protocol: [],
            host: [],
            port: []
        };

        var arr = [];
        if (typeof opts.origin === 'string') {
            arr.push(opts.origin);
        } else {
            arr = opts.origin;
        }

        arr.forEach(function (origin) {
            var props = url.parse(origin);
            ['protocol','host','port'].forEach(function (prop) {
                if (domainData[prop].indexOf(props[prop]) === -1) {
                    domainData[prop].push(props[prop]);
                }
            });
        });
    }

    // Function for validating the origin header
    function validateOrigin (origin) {
        var data = url.parse(origin);
        if(typeof data !== 'object') {
            return false;
        }
        // Match against the provided data
        return !['protocol','host','port'].some(function (key) {
            if(domainData[key].indexOf(data[key]) === -1) {
                return true;
            }
        });
    }

    return function csrf (req, res, next) {

        if (!req.cookies['XSRF-TOKEN']) {
            res.cookie('XSRF-TOKEN', Math.random().toString(36).substr(2), { maxAge: 900000});
        }
        // ignore these methods
        if ([ 'GET', 'POST', 'OPTIONS'].indexOf(req.method) !== -1) {
            next();
            return;
        }

        if (opts.origin) {
            var origin = req.get('origin') || req.get('referer');

            // Validate the header
            if(!origin || !validateOrigin(origin)) {
                req.log.warn('CSRF origin mismatch');
                req.session._csrfCount = req.session._csrfCount ? req.session._csrfCount++ : 1;
                next(req._httpError(412));
                return;
            }
        }

        if (opts.token) {
            lCsrf(req, res, function (err) {
                if (err) {
                    //TODO: Better logging
                    req.log.warn('CSRF token mismatch');
                    req.session._csrfCount = req.session._csrfCount ? req.session._csrfCount++ : 1;
                    next(req._httpError(412));
                    return;
                }

                if (req.body && req.body._csrf) {
                    delete req.body._csrf;
                }

                req.session._csrfCount = 0;
                next();
            });
            return;
        }

        if(req.body && req.body._csrf) {
            delete req.body._csrf;
        }

        if (req.session.isLoggedIn() && req.cookies['XSRF-TOKEN']) {
            var cToken = req.cookies['XSRF-TOKEN'];
            var hToken = req.get('X-XSRF-TOKEN');

            if (!cToken || !hToken || cToken !== hToken) {
                req.log.warn('CSRF header mismatch');
                req.session._csrfCount = req.session._csrfCount ? req.session._csrfCount++ : 1;
                next(req._httpError(412));
                return;
            }
        }

        // Everything ok, so continue
        next();
    };

};