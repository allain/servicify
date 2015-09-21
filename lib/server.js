var Promise = require('bluebird');
var defaults = require('defaults');

var ServicifyCatalog = require('./catalog');

var ip = require('./ip');

var express = require('express');
var app = require('express')();
app.use(require('body-parser').json());
var http = require('http').Server(app);
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
