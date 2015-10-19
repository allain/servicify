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

  dispatch: function (spec, args, opts) {
    return opts.driver.dispatch(spec, args, opts);
  }
};