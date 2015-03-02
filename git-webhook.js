'use strict';

var http = require('http');
var config = require('easy-config');
var bunyan = require('bunyan');

var log = bunyan.createLogger(config.extend(config.ns.git.log, {
    serializers: {
        req: bunyan.stdSerializers.req,
        error: bunyan.stdSerializers.err
    }
}));

var createHandler = require('github-webhook-handler')
var handler = createHandler({ path: '/', secret: config.ns.git.secret });

http.createServer(function (req, res) {
    handler(req, res, function (err) {
        res.statusCode = 404;
        res.end('no such location');
    });
}).listen(config.ns.git.port);

handler.on('error', function (err) {
    log.error({error: err}, 'Something went wrong');
});

handler.on('push', function (event) {
    exec('git pull', function (pullErr) {
        if(pullErr) {
            log.fatal({error: pullErr}, 'Failed to pull from git - exiting');
            process.exit();
        }
        exec('npm install', function (npmErr) {
            if(npmErr) {
                log.error({error: npmErr}, 'NPM install failed');
                return;
            }

            exec('forever restart index.js', function (foreverErr) {
                if(foreverErr) {
                    log.fatal({error: foreverErr}, 'Process restart failed');
                    process.exit();
                }
            });
        });
    });
});