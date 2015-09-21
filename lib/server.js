var Promise = require('bluebird');
var defaults = require('defaults');
var debug = require('debug')('servicify-server');
var ServicifyCatalog = require('./catalog');
var uniqid = require('uniqid');
var ip = require('./ip');
var omit = require('omit');
var format = require('json-rpc-protocol').format;

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

  var app = require('express')();
  app.use(require('body-parser').json());
  var http = require('http').Server(app);
  var io = require('socket.io')(http, {path: '/servicify'});

  var socketOmitter = omit(['socket']);

  var jsonRpcMethods = {
    offer: function (offer) {
      // being offered from a socket.io socket
      if (this.id) {
        offer.socket = this;
      }
      return catalog.offer(offer).then(socketOmitter);
    },
    rescind: function () {
      return catalog.rescind(arguments[0], arguments[1]).map(socketOmitter);
    },
    resolve: function (name, required) {
      return catalog.resolve(name, required).map(socketOmitter);
    },
    invoke: function (serviceId, params) {
      return catalog.get(serviceId).then(function(offering) {
        if (!offering) throw new Error('service not found: ' + serviceId);

        return new Promise(function (resolve, reject) {
          var socket = offering.socket;
          var requestId = uniqid();

          function handleResponse(response) {
            console.log('handling response');
            if (response.id === requestId) {
              socket.removeListener(handleResponse);
              if (response.error) {
                reject(response.error.message);
              } else {
                resolve(response.result);
              }
            }
          }

          socket.on('jsonrpc', handleResponse);

          var request = format.request(requestId, 'invoke', params);
          try {
            socket.emit('jsonrpc', request);
          } catch (e) {
            debug('ERROR while', e);
            reject(e);
          }
        });
      });
    }
  };

  app.post('/servicify', function (req, res) {
    jsonRpcProcessor(req.body, jsonRpcMethods).then(function (result) {
      res.json(result);
    });
  });

  io.on('connection', function (socket) {
    debug('a user connected:', socket.id);

    socket.on('disconnect', function () {
      debug('user disconnected:', socket.id);
    });

    socket.on('jsonrpc', function (invocations) {
      jsonRpcProcessor(invocations, jsonRpcMethods, socket).then(function (result) {
        socket.emit('jsonrpc', result);
      });
    });
  });

  return new Promise(function (resolve, reject) {
    http.listen(opts.port, function (err) {
      return err ? reject(err) : resolve({
        host: opts.host,
        port: opts.port,
        resolve: catalog.resolve.bind(catalog),
        rescind: catalog.rescind.bind(catalog),
        offer: catalog.offer.bind(catalog),
        stop: function () {
          return Promise.fromNode(function (cb) {
            http.on('close', function () {
              debug('http server closed');
              cb();
            });

            io.close();
          });
        }
      });
    });
  });
};

module.exports = ServicifyServer;
