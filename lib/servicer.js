var Promise = require('bluebird');
var debug = require('debug')('servicify-servicer');
var rpc = require('node-json-rpc');
var getPort = require('get-port');
var defined = require('defined');
var uniqid = require('uniqid');
var packagePath = require('package-path');
var defaults = require('defaults');
var ip = require('./ip');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var express = require('express');
var jsonRpcProcessor = require('jsonrpc-processor');


var getParamNames = require('get-parameter-names');

function ServicifyServicer(opts) {
  if (!(this instanceof ServicifyServicer)) return new ServicifyServicer(opts);

  EventEmitter.call(this);

  this.opts = opts = defaults(opts, {
    host: ip(),
    port: 2020,
    heartbeat: 10000
  });

  debug('using servicify-server at %s:%d', opts.host, opts.port);

  this.serverConnection = new rpc.Client({
    host: opts.host,
    port: opts.port,
    path: '/servicify',
    strict: true
  });
}

util.inherits(ServicifyServicer, EventEmitter);

ServicifyServicer.prototype.offer = function (target, spec) {
  var self = this;

  var app = require('express')();
  app.use(require('body-parser').json());
  var http = require('http').Server(app);

  if (typeof target === 'string') {
    if (target.match(/^[.]/)) { // relative path
      return Promise.reject(new Error('Relative paths are not supported for registration targets'));
    }

    var packageMain;
    try {
      packageMain = require.resolve(target);
    } catch (e) {
      return Promise.reject(e);
    }

    if (!packageMain) {
      return Promise.reject(new Error('unable to find required version of ' + target));
    }

    var pkgPath = packagePath.sync(packageMain);
    if (!pkgPath) {
      return Promise.reject(new Error('unable to find package for ' + target));
    }

    var pkg = require(pkgPath + '/package.json');
    spec = {name: pkg.name, version: pkg.version};

    target = require(target);
  }

  var host = defined(spec.host, '127.0.0.1');
  var port = spec.port ? Promise.resolve(spec.port) : Promise.fromNode(getPort);

  debug('exposing %s@%s at %s:%d', spec.name, spec.version, host, port);

  var service;
  var invocations = 0;
  var lastOffering;

  return port.then(function (port) {
    var targetType;
    if (typeof target === 'function') {
      var paramNames = getParamNames(target);
      var usesCallback = paramNames[paramNames.length - 1].match(/^cb|callback$/g);
      if (usesCallback) {
        targetType = 'callback';
      } else {
        targetType = 'promised';
      }
    } else {
      throw new Error('unsupported target type');
    }

    var serviceSpec = {
      name: spec.name,
      version: spec.version,
      host: host,
      port: port,
      type: targetType,
      load: 0
    };

    function invoke() {
      var args = [].slice.call(arguments);

      return new Promise(function (resolve, reject) {
        invocations++;

        if (targetType === 'callback') {
          args.push(function (err, result) {
            return err ? reject(err) : resolve(result);
          });
        }

        var result = target.apply(null, args);
        if (result && result.then && typeof result.then === 'function') {
          result.then(resolve, reject);
        } else if (!usesCallback) {
          reject(new Error('target must be asynchronous'));
        }
      });
    }

    app.post('/servicify', function (req, res) {
      jsonRpcProcessor(req.body, {
        invoke: invoke
      }).then(function(result) {
        res.json(result);
      });
    });

    return Promise.fromNode(function (cb) {
      http.listen(serviceSpec.port, cb);
    }).then(function () {
      return sendOffer(serviceSpec);
    }).then(function (offering) {
      debug('target offered as %j', offering);
      debug('heartbeat set to %dms', self.opts.heartbeat);
      var heartbeatIntervalid = setInterval(function () {
        sendOffer(offering).then(function (result) {
          self.emit('heartbeat', result);
          debug('heartbeat result: %j', result);
        });
      }, self.opts.heartbeat);

      service = {
        load: 0,
        host: offering.host,
        port: offering.port,
        name: offering.name,
        server: {
          host: self.opts.host,
          port: self.opts.port
        },
        version: offering.version,
        invoke: invoke,
        stop: function () {
          clearInterval(heartbeatIntervalid);
          debug('rescinding offer');

          return callRpc(self.serverConnection, 'rescind', [offering.id]).then(function (result) {
            debug('rescind result: %j', result);
          }).then(function () {
            return Promise.fromNode(function (cb) {
              console.log('closing http server');
              http.close(cb);
            });
          });
        }
      };

      return service;
    });
  });

  function sendOffer(offering) {
    offering.load = invocations ? Math.round(invocations / ((Date.now() - lastOffering) / 1000)) : 0;
    if (service) {
      service.load = offering.load;
    }
    lastOffering = Date.now();
    invocations = 0;

    offering.expires = Date.now() + self.opts.heartbeat * 3;

    return callRpc(self.serverConnection, 'offer', [offering]);
  }
};

function callRpc(client, method, params) {
  return Promise.fromNode(function (cb) {
    client.call({
      'jsonrpc': '2.0',
      'method': method,
      'params': params,
      'id': uniqid()
    }, cb);
  }).then(function (res) {
    return res.result;
  });
}

module.exports = ServicifyServicer;

