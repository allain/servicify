var Promise = require('native-promise-only');
var getParamNames = require('get-parameter-names');
var defaults = require('defaults');

var debug = require('debug')('callback-function');
var Client = require('pigato').Client;

module.exports = {
  type: 'callback-function',
  applies: function (target) {
    if (typeof target !== 'function') return false;

    var paramNames = getParamNames(target);
    return paramNames.length && paramNames[paramNames.length - 1].match(/^cb|callback$/g);
  },
  invoke: function (target, args) {
    return new Promise(function (resolve, reject) {
      args.push(function (err, result) {
        return err ? reject(err) : resolve(result);
      });

      target.apply(null, args);
    });
  },
  request: function (spec, args, opts) {
    var cb = args.pop();

    opts = defaults(opts, {
      timeout: 10000,
      host: '127.0.0.1',
      port: 2020
    });


    var client = new Client('tcp://' + opts.host + ':' + opts.port);
    client.once('error', function (err) {
      debug('error', err);
      cb(err);
      cb = function() {};
    });

    client.once('start', function() {
      client.request(spec, {args: args}, false, function(err, result) {
        client.once('stop', function() {
          cb(err, result);
        });
        client.stop();
      }, {timeout: opts.timeout});
    });

    client.start();
  }
};