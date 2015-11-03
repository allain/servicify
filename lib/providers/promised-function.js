var Promise = require('native-promise-only');

module.exports = {
  type: 'promised-function',

  applies: function (target) {
    return typeof target === 'function';
  },

  invoke: function (target, args) {
    return new Promise(function (resolve) {
      resolve(target.apply(null, args));
    });
  },

  call: function (spec, args, opts) {
    return opts.driver.call(spec, args, opts);
  }
};