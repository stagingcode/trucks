'use strict';

var cluster = require('cluster');
var numCPUs = require('os').cpus().length; // Ask the number of CPU-s for optimal forking (one fork per CPU)
var PORT = +process.env.PORT || 3000;

cluster.setupMaster({
    exec : 'index.js'
});

// Fork workers.
for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
}

cluster.on('disconnect', function(worker) {
    console.error('disconnect!'); // This can probably use some work.
    cluster.fork();
});