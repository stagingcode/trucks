'use strict';

var express = require('express');
var easySession = require('easy-session');

module.exports = function () {
    var app = express.Router();

    app.use('/auth', require('./auth')());

    app.use(easySession.isLoggedIn());

    app.use('/account', require('./account')());

    return app;
};