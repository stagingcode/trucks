'use strict';

var express = require('express');

module.exports = function () {
    var app = express.Router();

    app.use('/api', require('./api')());

    return app;
};