var Promise = require('native-promise-only');
var getParamNames = require('get-parameter-names');
var uniqid = require('uniqid');

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

      if (!result || !result.then || typeof result.then !== 'function') return null;

      return result;
    } catch (e) {
      return Promise.reject(e);
    }
  },
  rpc: function (client, args) {
    return new Promise(function(resolve, reject) {
      client.call({
        'jsonrpc': "2.0",
        'method': 'invoke',
        'params': args,
        'id': uniqid()
      }, function(err, res) {
        if (err) return reject(err);
        if (res.error) return reject(new Error(res.error.message));

        resolve(res.result);
      });
    });
  }
};