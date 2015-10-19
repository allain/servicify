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

  request: function (spec, args, opts) {
    return opts.driver.request(spec, args, opts);
  }
};