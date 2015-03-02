'use strict';

var bcrypt = require('bcrypt');

var accountModel = function (sequelize, DataTypes) {
    return sequelize.define('Account', {
        id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
        email: {type: DataTypes.STRING, unique: true},
        password: DataTypes.STRING
    }, {
        hooks: {
            beforeCreate: function (user, next) {
                bcrypt.hash(user.password, 12, function (err, hash) {
                    if(err) {
                        next(err);
                        return;
                    }
                    user.password = hash;
                    next();
                });
            },
            beforeUpdate: function (user, next) {
                if(user.password !== user.previous('password')) {
                    bcrypt.hash(user.password, 12, function (err, hash) {
                        if(err) {
                            next(err);
                            return;
                        }
                        user.password = hash;
                        next();
                    });
                } else {
                    next();
                }
            }
        },
        instanceMethods: {
            isValidPassword: function (password, callback) {
                bcrypt.compare(password, this.password, function (err, isValid) {
                    if(err) {
                        callback(err);
                        return;
                    }

                    callback(null, isValid);
                });
            }
        }
    });
};

module.exports = accountModel;