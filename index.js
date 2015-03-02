'use strict';

var fs = require('fs');
var http = require('http');
var redis = require('redis');
var bunyan = require('bunyan');
var cluster = require('cluster');

var express = require('express');
var compress = require('compression');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var bodyParser = require('body-parser');

var httperrors = require('httperrors');
var config = require('easy-config');
var RedisStore = require('connect-redis')(session);
var easySession = require('easy-session');

var seed = (new Date()).getTime();
var version = require('./package.json').version;
var env = process.env.NODE_ENV || 'development';
var isDevelopment = (env === 'development');

if (!fs.existsSync('./public/assets/tpl/partials.json')) {
    throw new Error('Partials not compiled. Please run "gulp" to build application');
}

var partials = JSON.parse(fs.readFileSync('./public/assets/tpl/partials.json'));
var server = null;

var log = bunyan.createLogger(config.extend(config.log, {
    serializers: {
        req: bunyan.stdSerializers.req,
        error: bunyan.stdSerializers.err
    }
}));

var redisClient = redis.createClient(config.redis.port, config.redis.host, {auth_pass: config.redis.pass});
redisClient.select(config.redis.db);

var app = express();

app.use(compress());
app.use('/public', express.static(__dirname + '/public'));
app.use(cookieParser(config.secret));
app.use(session({
    store: new RedisStore(config.extend(config.redis, {
        retry_max_delay: 1000,
        connect_timeout: 1000,
        debug_mode: true,
        ttl: (15 * 60) // 15 minutes
    })),
//    domain: 'secure.example.com', // limit the cookie exposure
//    secure: true, // set the cookie only to be served with HTTPS
    key: 'id', // use a generic id
    secret: config.secret
}));

app.use(function (req, res, next) {
    //Attach log and redis
    req.log = log;
    req.redis = redisClient;

    // Log request start
    req.log.debug({
        path: req.path,
        ip: req.ip,
        method: req.method
    }, 'Incoming request');

    var start = Date.now();
    function logRequest(){
        res.removeListener('finish', logRequest);
        res.removeListener('close', logRequest);
        req.log.info({
            path: req.path,
            ip: req.ip,
            method: req.method,
            request_time: Date.now() - start,
            status_code: this.statusCode
        }, 'Request end');
    };

    res.on('finish', logRequest);
    res.on('close', logRequest);

    req._httpError = function (code, description) {
        var err = new httperrors[code];
        if (description)
            err.description = description;
        return err;
    };

    next();
});

var hbs = require('handlebars').create();
hbs.registerHelper('equals', function equalsHandler(a, b, res) {
    if(a == b) {
        return res;
    }
    return '';
});

app.use(easySession.main(session));
app.use(bodyParser());
app.use(require('./lib/csrf')(config.csrf));
app.use(require('./routes')());

// Load layout templates
var defaultLayoutFn = hbs.compile(fs.readFileSync('./src/tpl/hb/layout-default.handlebars', 'utf8'));
var userLayoutFn = hbs.compile(fs.readFileSync('./src/tpl/hb/layout-user.handlebars', 'utf8'));

app.use(function (req, res, next) {
    res.locals.version = version;
    res.locals.env = env;
    res.locals.seed = seed;
    res.locals.isDevelopment = isDevelopment;

    res.render = function (name, context) {
        var path = './src/tpl/hb/' + name + '.handlebars';
        var self = this;
        var layoutFn = defaultLayoutFn;

        if (req.session && req.session.isLoggedIn()) {
            res.locals.partials = partials;
            layoutFn = userLayoutFn;
        }

        self.locals.page = name;
        fs.readFile(path, 'utf8', function (err, partial) {
            if (err) {
                next(req._httpError(404));
                return;
            }

            var partialFn = hbs.compile(partial);
            var data = self.locals;
            data._body = partialFn(context);

            res.send(layoutFn(data));
        });
    };

    next();
});

app.get('/trucks/?*', function (req, res, next) {

    res.locals._isLoggedIn = req.session.isLoggedIn();

    if (!req.session.isLoggedIn()) {
        res.redirect('/login?return=' + encodeURIComponent(req.originalUrl));
        return;
    } else {
        res.locals.user = req.session.user;
    }

    res.locals.partials = partials;
    res.send(userLayoutFn(res.locals));
});

app.get('/?*', function (req, res, next) {
    var page = req.params && req.params[0];
    if(!page) {
        page = 'index';
    } else if (page == 'set-new-password' && !req.session.hashEmail) {
        res.redirect('/register');
    } else {
        var arr = page.match(/[a-zA-Z0-9-]/g);
        page = arr.join('');
    }

    res.locals._isLoggedIn = req.session.isLoggedIn();

    if (res.locals._isLoggedIn) {
        res.locals._userId = req.session.userId;
    }

    res.render(page);
});


app.use(function (err, req, res, next) {
    var defaultMsgs = {
        _400: 'Bad request',
        _401: 'Unauthorized',
        _404: 'Page not found',
        _406: 'NotAcceptable',
        _409: 'Conflict',
        _503: 'Gateway error'
    };

    // CSRF token failure
    if (err.PreconditionFailed) {
        if (req.session._csrfCount < 2 && !req.xhr) {
            res.redirect(req.headers.origin || req.headers.referer || '/');
        }

        return;
    }

    // Return error response
    if (err.statusCode && Object.keys(defaultMsgs).indexOf('_' + err.statusCode) !== -1) {
        if (req.xhr || (req.headers['content-type'] && req.headers['content-type'].indexOf('application/json') !== -1)) {
            res.send(err.statusCode, {
                error: {
                    code: err.statusCode,
                    msg: err.description || defaultMsgs['_' + err.statusCode]
                }
            });
        } else {
            res
                .status(err.statusCode)
                .render('error', {
                    statusCode: err.statusCode,
                    msg: err.description || defaultMsgs['_' + err.statusCode]
                });
        }

        return;
    }

    var friendly = {
        message: err.message,
        stack: err.stack
    };

    req.log.error({error: friendly}, 'Something went wrong');

    // Note: we're in dangerous territory!
    // By definition, something unexpected occurred,
    // which we probably didn't want.
    // Anything can happen now!  Be very careful!

    try {
        // make sure we close down within 30 seconds
        var killtimer = setTimeout(function() {
            process.exit(1);
        }, 30000);
        // But don't keep the process open just for that!
        killtimer.unref();

        // stop taking new requests.
        server.close();

        // Let the master know we're dead.  This will trigger a
        // 'disconnect' in the cluster master, and then it will fork
        // a new worker.
        if(cluster.worker) {
            cluster.worker.disconnect();
        }

        var message = '<h3>Oops, there was a problem!</h3>';
        if(!config.isProduction()) {
            message += '<br/><br/><h4>' + err.message + '</h4>' +
                '<pre>' + err.stack + '</pre>';
        }
        // try to send an error to the request that triggered the problem
        res.status(500).render('error', {statusCode: 500});
    } catch (err2) {
        // oh well, not much we can do at this point.
        var friendly2 = {
            message: err2.message,
            stack: err2.stack
        };
        req.log.error({error: friendly2}, 'Error sending 500!');
        res.end();
    }
});

server = http.createServer(app);
server.listen(config.port, function () {
    log.info('%s listening on %d', config.name, config.port);
});