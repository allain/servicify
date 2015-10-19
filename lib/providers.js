var getParamNames = require('get-parameter-names');

module.exports = {
  'callback-function': {
    type: 'callback-function',
    applies: function (target) {
      if (typeof target !== 'function') return false;

      var paramNames = getParamNames(target);

      return paramNames.length && paramNames[paramNames.length - 1].match(/^cb|callback$/g);
    },
    invoke: function (target, args) {
      return new Promise(function (resolve, reject) {
        target.apply(null, args.concat(function (err, result) {
          return err ? reject(err) : resolve(result);
        }));
      });
    },
    request: function (spec, args, opts) {
      var cb = args.pop();

      opts.driver.request(spec, args, opts).then(function (result) {
        cb(null, result);
      }, function (err) {
        cb(null, err);
      });
    }
  },
  'promised-function': {
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
  }
};