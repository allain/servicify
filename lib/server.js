var Promise = require('native-promise-only');
var defaults = require('defaults');
var Broker = require('pigato').Broker;
var Client = require('pigato').Client;
var ip = require('./ip');

function ServicifyServer(opts) {
  if (!(this instanceof ServicifyServer)) return new ServicifyServer(opts);
}

ServicifyServer.prototype.listen = function (opts) {
  opts = defaults(opts, {
    port: 2020,
    host: ip() || '0.0.0.0'
  });

  var brokerAddress = 'tcp://' + opts.host + ':' + opts.port;

  return start(new Broker(brokerAddress)).then(function (broker) {
    return start(new Client(brokerAddress)).then(function (client) {
      return {
        host: opts.host,
        port: opts.port,
        invoke: function (spec, args, invokeOpts) {
          invokeOpts = defaults(invokeOpts, {timeout: 10000});

          return new Promise(function (resolve, reject) {
            client.request(spec, {args: args}, false, function (err, response) {
              return err ? reject(new Error(err)) : resolve(response);
            }, {
              timeout: invokeOpts.timeout
            });
          });
        },
        stop: function () {
          return stop(client).then(function () {
            return stop(broker);
          });
        }
      };
    });
  });
};

function start(startable) {
  startable.on('error', console.error.bind(console));

  return new Promise(function (resolve) {
    startable.once('start', function () {
      resolve(startable);
    });
    startable.start();
  });
}

function stop(stoppable) {
  stoppable.removeAllListeners('error');

  return new Promise(function (resolve) {
    stoppable.once('stop', function () {
      resolve(stoppable);
    });
    stoppable.stop();
  });
}

module.exports = ServicifyServer;
