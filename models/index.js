module.exports = function (sequelize) {
    return {
        Account: sequelize.import(__dirname +'/account.js')
    };
};
