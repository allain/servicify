var Promise = require('native-promise-only');
var defaults = require('defaults');

var Client = require('pigato').Client;

module.exports = {
  type: 'promised-function',
  applies: function (target) {
    return typeof target === 'function';
  },
  invoke: function (target, args) {
    try {
      var result = target.apply(null, args);
      if (result === undefined) {
        return Promise.resolve();
      }

      if (!result || !result.then || typeof result.then !== 'function') {
        return Promise.resolve(null);
      }

      return result;
    } catch (e) {
      return Promise.reject(e);
    }
  },
  build: function(target) {
    return function() {
      var params = [].slice.call(arguments);

      return target.then(function(fn) {
        return fn.apply(null, params);
      });
    };
  },
  request: function (spec, args, opts) {
    opts = defaults(opts, {
      timeout: 10000,
      host: '127.0.0.1',
      port: 2020
    });

    var client = new Client('tcp://' + opts.host + ':' + opts.port);

    return new Promise(function (resolve, reject) {
      client.once('start', resolve);
      client.once('error', reject);
      client.start();
    }).then(function () {
      return new Promise(function (resolve, reject) {

        client.request(spec, {args: args}, false, function (err, response) {
          client.once('stop', function () {
            return err ? reject(err) : resolve(response);
          });
          client.stop();
        }, {timeout: opts.timeout});
      });
    });
  }
};