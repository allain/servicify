var Promise = require('native-promise-only');
var defaults = require('defaults');

var ServicifyCatalog = require('./catalog');

var ip = require('./ip');
var sockjs = require('sockjs');
var express = require('express');
var uniqid = require('uniqid');
var assert = require('assert');
var debug = require('debug')('servicify-server');

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
    host: ip() || '0.0.0.0'
  });


  var app = express();
  app.use(require('body-parser').json());
  var http = require('http').Server(app);

  var serviceConnMap = {};
  var methods = {
    offer: function(offer) {
      var conn = this.conn;

      return catalog.offer(offer).then(function(offering) {
        assert(typeof offering.id === 'string');
        serviceConnMap[offering.id] = conn;
        return offering;
      });
    },
    rescind: function() {
      return catalog.rescind(arguments[0], arguments[1]);
    },
    resolve: function(name, required) {
      return catalog.resolve(name, required);
    },
    invoke: function(serviceId, params) {
      var serviceConn = serviceConnMap[serviceId];
      if (!serviceConn) {
        return Promise.reject(new Error('Service not found: ' + serviceId));
      }

      var requestId = uniqid();

      return new Promise(function(resolve, reject) {
        function handleResponse(response) {
          var msg = JSON.parse(response);
          if (msg.id=== requestId) {
            debug('response received for %s: %j', requestId, msg);

            serviceConn.removeListener('data', handleResponse);

            if (msg.result) {
              resolve(msg.result);
            } else {
              reject(new Error(msg.error.message));
            }
          }
        }

        serviceConn.on('data', handleResponse);

        debug('sending invoke request %s to %s with params %j over sockjs', requestId, serviceId, params);

        serviceConn.write(JSON.stringify({
          jsonrpc: '2.0',
          method: 'invoke',
          params: params,
          id: requestId
        }));
      }).then(function(result) {
        debug('result of proxy invoke: %j', result);
        return result;
      });
    }
  };

  var sockjsJsonRpc = sockjs.createServer({
    sockjs_url: 'http://cdn.jsdelivr.net/sockjs/1.0.1/sockjs.min.js',
    log: function() {}
  });

  sockjsJsonRpc.on('connection', function(conn) {
    conn.on('data', function(invocations) {
      invocations = JSON.parse(invocations);
      if (Array.isArray(invocations)) {
        invocations = invocations.filter(function(i) {
          return !!i.method;
        });
      } else if (!invocations.method) {
        return;
      }

      jsonRpcProcessor(invocations, methods, {conn: conn}).then(function(result) {
        if (result !== undefined) {
          debug('sending result to sockjs client: %j', result);
          conn.write(JSON.stringify(result));
        }
      });
    });
  });
  sockjsJsonRpc.installHandlers(http, {prefix:'/servicify-sockjs'});

  app.post('/servicify', function (req, res) {
    jsonRpcProcessor(req.body, methods).then(function(result) {
      debug('sending response to client over http %j', result);
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
          return new Promise(function(resolve, reject) {
            http.close(function(err) {
              return err ? reject(err) : resolve();
            });
          });
        }
      });
    });
  });
};

module.exports = ServicifyServer;
