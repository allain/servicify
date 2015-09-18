var rpc = require('node-json-rpc');
var Promise = require('bluebird');
var ServicifyCatalog = require('./catalog');

function ServicifyServer(opts) {
  if (!(this instanceof ServicifyServer)) return new ServicifyServer(opts);

  opts = opts || {};

  this.catalog = new ServicifyCatalog(opts);
}

ServicifyServer.prototype.listen = function (opts) {
  var catalog = this.catalog;

  opts = opts || {};

  var port = opts.port || 2020;
  var host = opts.host || '127.0.0.1';

  var server = new rpc.Server({
    port: port,
    host: host,
    path: '/servicify/',
    strict: true
  });

  server.port = port;
  server.host = host;

  server.addMethod('offer', function (args, cb) {
    catalog.offer(args[0]).nodeify(cb);
  });
  server.addMethod('rescind', function (args, cb) {
    catalog.rescind(args[0], args[1]).nodeify(cb);
  });
  server.addMethod('resolve', function (args, cb) {
    catalog.resolve(args[0], args[1]).nodeify(cb);
  });

  return Promise.fromNode(function(cb) {
    server.start(cb);
  }).then(function() {
    return {
      host: host,
      port: port,
      resolve: catalog.resolve.bind(catalog),
      rescind: catalog.rescind.bind(catalog),
      offer: catalog.offer.bind(catalog),
      stop: Promise.promisify(server.stop)
    };
  });
};

module.exports = ServicifyServer;
