var Promise = require('native-promise-only');
var defaults = require('defaults');
var defaults = require('defaults');
var Broker = require('pigato').Broker;
var Client = require('pigato').Client;
var ip = require('./ip');
var debug = require('debug')('servicify-server');

function ServicifyServer(opts) {
  if (!(this instanceof ServicifyServer)) return new ServicifyServer(opts);
}

ServicifyServer.prototype.listen = function (opts) {
  opts = defaults(opts || {}, {
    port: 2020,
    host: ip() || '0.0.0.0'
  });


  var broker = new Broker('tcp://' + opts.host + ':' + opts.port);
  var client;

  return new Promise(function (resolve, reject) {
    broker.once('error', function (err) {
      reject(err);
    });

    broker.once('start', function () {
      client = new Client('tcp://' + opts.host + ':' + opts.port);

      client.on('error', function (err) {
        debug('on error %j', err);
      });

      client.once('start', function () {
        resolve({
          host: opts.host,
          port: opts.port,
          invoke: function (spec, args, invokeOpts) {
            invokeOpts = defaults(invokeOpts, {
              timeout: 10000
            });

            return new Promise(function (resolve, reject) {
              client.request(spec, {args: args}, false, function (err, response) {
                return err ? reject(new Error(err)) : resolve(response);
              }, {timeout: invokeOpts.timeout});
            });
          },
          stop: function () {
            return new Promise(function (resolve) {
              client.once('stop', function() {
                broker.once('stop', function () {
                  resolve();
                });
                broker.stop();
              });
              client.stop();
            });
          }
        });
      });
      client.start();

    });
    broker.start();
  });
};

module.exports = ServicifyServer;
