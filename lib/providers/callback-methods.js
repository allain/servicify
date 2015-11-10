var getParamNames = require('get-parameter-names');
var Promise = require('native-promise-only');
var isArray = require('is-array');

module.exports = {
  type: 'callback-methods',

  applies: function (target) {
    if (typeof target !== 'object' || isArray(target)) return false;

    var keys = Object.keys(target);
    for (var i = 0; i < keys.length; i++) {
      var method = target[keys[i]];
      if (typeof method !== 'function')
        continue;

      var paramNames = getParamNames(method);

      // Does this method's last param have the correct name
      if (paramNames.length && paramNames[paramNames.length - 1].match(/^cb|callback$/g)) {
        return true;
      }
    }

    return false;
  },

  invoke: function (target, args) {
    return new Promise(function (resolve, reject) {
      // 1st argument is method name
      var effectiveArgs = [].concat(args);
      var methodName = effectiveArgs.shift();
      effectiveArgs.push(function (err, result) {
        return err ? reject(err) : resolve(result);
      });

      target[methodName].apply(null, effectiveArgs);
    });
  },

  call: function (spec, args, opts) {
    var effectiveArgs = [].concat(args);
    var cb = effectiveArgs.pop();

    opts.driver.call(spec, effectiveArgs, opts).then(function (result) {
      cb(null, result);
    }, function (err) {
      cb(null, err);
    });
  }
};