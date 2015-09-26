var Promise = require('native-promise-only');
var debug = require('debug')('servicify-servicer');
var rpc = require('node-json-rpc');
var getPort = require('get-port');
var uniqid = require('uniqid');
var packagePath = require('package-path');
var defaults = require('defaults');
var ip = require('./ip');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var jsonRpcProcessor = require('jsonrpc-processor');
var buildInvoker = require('./invokers');

function ServicifyServicer(opts) {
  if (!(this instanceof ServicifyServicer)) return new ServicifyServicer(opts);

  EventEmitter.call(this);

  this.opts = opts = defaults(opts, {
    host: ip() || '127.0.0.1',
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
  } else if (typeof spec !== 'object') {
    return Promise.reject(new Error('spec not given with offer'));
  }

  var sockjsClient = require('node-sockjs-client')('http://' + self.opts.host + ':' + self.opts.port + '/servicify-sockjs');

  var host = spec.host || '127.0.0.1';
  var port = spec.port ? Promise.resolve(spec.port) : new Promise(function(resolve, reject) {
    getPort(function(err, port) {
      return err ? reject(err) : resolve(port);
    });
  });

  var service;
  var invocations = 0;
  var lastOffering;

  return port.then(function (port) {
    debug('exposing %s@%s at %s:%d', spec.name, spec.version, host, port);

    var invoker = buildInvoker(target);
    if (!invoker) {
      throw new Error('unsupported target type');
    }

    var serviceSpec = {
      name: spec.name,
      version: spec.version,
      host: host,
      port: port,
      type: invoker.type,
      load: 0
    };

    function invoke() {
      var args = [].slice.call(arguments);
      invocations++;
      return invoker.invoke(target, args);
    }

    var jsonRpcMethods = {
      invoke: invoke
    };

    var responseMap = {};

    sockjsClient.onmessage = function (e) {
      var msg = JSON.parse(e.data);
      debug('message received from sockjs connection %j', msg);

      var cb = responseMap[msg.id];
      if (cb) {
        return cb(msg.error ? new Error(msg.error.message) : null, msg);
      }

      if (msg.id && !msg.error) {
        // Incoming invocation
        jsonRpcProcessor(msg, jsonRpcMethods).then(function (result) {
          debug('result computed: ', result);
          sockjsClient.send(JSON.stringify(result));
        });
      }
    };


    app.post('/servicify', function (req, res) {
      jsonRpcProcessor(req.body, jsonRpcMethods).then(function (result) {
        res.json(result);
      });
    });

    return new Promise(function(resolve, reject) {
      http.listen(serviceSpec.port, function(err) {
        return err ? reject(err) : resolve();
      });
    }).then(function () {
      return waitForSockjsConnection(sockjsClient);
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
        id: offering.id,
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
            sockjsClient.onclose = function () {
              return new Promise(function(resolve, reject) {
                debug('closing http server');
                http.close(function(err) {
                  return err ? reject(err) : resolve();
                });
              });
            };

            debug('closing sockjs server');
            sockjsClient.close();
          });
        }
      };

      return service;
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

    function callRpc(client, method, params) {
      var request = {
        'jsonrpc': '2.0',
        'method': method,
        'params': params,
        'id': uniqid()
      };

      return new Promise(function (resolve, reject) {
        responseMap[request.id] = function (err, result) {
          delete responseMap[request.id];
          return err ? reject(err) : resolve(result);
        };

        sockjsClient.send(JSON.stringify(request));
      }).then(function (res) {
        return res.result;
      });
    }
  });

  function waitForSockjsConnection(client) {
    return new Promise(function (resolve, reject) {
      var timeoutId = setTimeout(function() {
        reject(new Error('gave up waiting for sockjs connection'));
      }, 10000);

      client.onopen = function () {
        clearTimeout(timeoutId);
        resolve();
      };
    });
  }
};


module.exports = ServicifyServicer;
