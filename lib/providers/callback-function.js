var getParamNames = require('get-parameter-names');

// Providers wrap different kinds of npm packages for use in servicify

module.exports = {
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
  dispatch: function (spec, args, opts) {
    var cb = args.pop();

    opts.driver.dispatch(spec, args, opts).then(function (result) {
      cb(null, result);
    }, function (err) {
      cb(null, err);
    });
  }
};