'use strict';

var config = require('easy-config');
var Sequelize = require('sequelize');

var sequelize = new Sequelize(config.mysql.db, config.mysql.user, config.mysql.password, {
    host: config.mysql.host,
    port: config.mysql.port,
    dialect: 'mysql'
});

// import sequelize models
var models = require('../models/index')(sequelize);

// sync all the tables
sequelize.sync();

module.exports = function () {
    return {
        db: sequelize,
        models: models
    };
};