var Promise = require('bluebird');
var defaults = require('defaults');

var ServicifyCatalog = require('./catalog');

var ip = require('./ip');
var sockjs = require('sockjs');
var express = require('express');

var jsonRpcProcessor = require('jsonrpc-processor');

function ServicifyServer(opts) {
  if (!(this instanceof ServicifyServer)) return new ServicifyServer(opts);

  opts = opts || {};

  this.catalog = new ServicifyCatalog(opts);
}

ServicifyServer.prototype.listen = function (opts) {
  var catalog = this.catalog;

  opts = defaults(opts, {
    port: 2020,
    host: ip()
  });


  var app = express();
  app.use(require('body-parser').json());
  app.log = function(msg) {
    debug(msg);
  };
  var http = require('http').Server(app);

  var methods = {
    offer: function(offer) {
      return catalog.offer(offer);
    },
    rescind: function() {
      return catalog.rescind(arguments[0], arguments[1]);
    },
    resolve: function(name, required) {
      return catalog.resolve(name, required);
    }
  };

  var sockjsJsonRpc = sockjs.createServer({sockjs_url: "http://cdn.jsdelivr.net/sockjs/1.0.1/sockjs.min.js", log: function() {}});
  sockjsJsonRpc.on('connection', function(conn) {
    conn.on('data', function(invocations) {
      jsonRpcProcessor(JSON.parse(invocations), methods).then(function(result) {
        conn.write(JSON.stringify(result));
      });
    });
  });
  sockjsJsonRpc.installHandlers(http, {prefix:'/servicify-sockjs'});

  app.post('/servicify', function (req, res) {
    jsonRpcProcessor(req.body, methods).then(function(result) {
      res.json(result);
    });
  });

  return new Promise(function(resolve, reject) {
    http.listen(opts.port, function (err) {
      return err ? reject(err) : resolve({
        host: opts.host,
        port: opts.port,
        resolve: catalog.resolve.bind(catalog),
        rescind: catalog.rescind.bind(catalog),
        offer: catalog.offer.bind(catalog),
        stop: function() {
          return Promise.fromNode(function(cb) {
            http.close(cb);
          });
        }
      });
    });
  });
};

module.exports = ServicifyServer;
