var Promise = require('bluebird');
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
    return Promise.fromNode(function (cb) {
      client.call({
        'jsonrpc': "2.0",
        'method': 'invoke',
        'params': args,
        'id': uniqid()
      }, cb);
    }).then(function (res) {
      if (res.error) {
        throw new Error(res.error.message);
      }

      return res.result;
    });
  }
};