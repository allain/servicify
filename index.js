var ServicifyClient = require('servicify-client');
var getParamNames = require('get-parameter-names');

module.exports = function(packageName, opts) {
  opts = opts || {};

  var target = require(packageName);
  var targetType;
  if (typeof target === 'function') {
    var paramNames = getParamNames(target);
    var usesCallback = paramNames[paramNames.length - 1].match(/^cb|callback$/g);
    if (usesCallback) {
      targetType = 'callback';
    } else {
      targetType = 'promised';
    }
  } else {
    throw new Error('unsupported package export type');
  }

  var client = new ServicifyClient();

  if (targetType === 'callback') {
    return function() {
      var params = [].slice.call(arguments);

      client.resolve(packageName).then(function(fn) {
        fn.apply(null, params);
      });
    };
  } else if (targetType === 'promised') {
    return function() {
      var params = [].slice.call(arguments);

      return client.resolve(packageName).then(function(fn) {
        return fn.apply(null, params);
      });
    };
  }
};
