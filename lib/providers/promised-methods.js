var Promise = require('native-promise-only');
var isArray = require('is-array');

module.exports = {
  type: 'promised-methods',

  applies: function (target) {
    return typeof target === 'object' &&  !isArray(target);
  },

  invoke: function (target, args) {
    return new Promise(function (resolve) {
      var effectiveArgs = [].concat(args);
      var methodName = effectiveArgs.shift();
      resolve(target[methodName].apply(target, effectiveArgs));
    });
  },

  call: function (spec, args, opts) {
    return opts.driver.call(spec, args, opts);
  }
};