var path = require('path');
var glob = require('glob');
var servers = glob.sync('./node_modules/protractor/selenium/selenium-server-standalone-*');

if (!servers.length) {
    throw new Error('Selenium standalone server not found');
}

exports.config = {
    // The address of a running selenium server.
    seleniumServerJar: path.join(process.cwd(), servers[0]),
    //seleniumAddress: 'http://localhost:4444/wd/hub',

    // Capabilities to be passed to the webdriver instance.
    capabilities: {
        'browserName': 'chrome'
    },

    resultJsonOutputFile: path.join(process.cwd(), 'protractor-run.json'),
    allScriptsTimeout: 500000,
    framework: 'mocha',
    mochaOpts: {
        reporter: 'spec',
        slow: 10000
    }
};