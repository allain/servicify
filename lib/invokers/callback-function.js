var Promise = require('native-promise-only');
var getParamNames = require('get-parameter-names');
var uniqid = require('uniqid');

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
  rpc: function (client, args) {
    var cb = args.pop();
    client.call({
      'jsonrpc': "2.0",
      'method': 'invoke',
      'params': args,
      'id': uniqid()
    }, function (err, res) {
      if (err) {
        cb(err);
      } else if (res.result) {
        cb(null, res.result);
      } else if (res.error) {
        cb(new Error(res.error.message));
      }
    });
  }
};

function callRpc(client, method, params) {
  return Promise.fromNode(function (cb) {

  }).then(function (res) {
    return res.result;
  });
}