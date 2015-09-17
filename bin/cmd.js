#!/usr/bin/env node
var ServicifyService = require('servicify-service');
var ServicifyServer = require('servicify-server');

var fs = require('fs');

var argv = require('minimist')(process.argv.slice(2));

if (argv.version) {
  return console.log(require('../package.json').version);
}

var cmd = argv._[0];

if (argv.version) {
  return console.log(require('../package.json').version);
}

if (!cmd || argv.h || argv.help) {
  return fs.createReadStream(__dirname + '/usage.txt').pipe(process.stdout);
}

argv._.shift();

if (cmd === 'listen') {
  var host = argv.host || '127.0.0.1';
  var port = argv.port || argv._[0];
  var server = new ServicifyServer();
  server.listen({host: host, port: port}).then(function(srv) {
    console.log('servicify server listening on', srv.host + ':' + srv.port);
  });
} else if(cmd === 'register') {
  var host = argv.host || '127.0.0.1';
  var port = argv.port || 2020;

  var service = new ServicifyService({
    host: host,
    port: port
  });

  service.register(argv._[0]).then(function (r) {
    console.log(arguments);
    console.log('registered', r.name + '@' + r.version, 'at', r.host + ':' + r.port);
  }, function (err) {
    console.error('unable to register', r.name + '@' + r.version, 'at', r.host + ':' + r.port);
    console.error(err);
  });
}
