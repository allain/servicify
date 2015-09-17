var ServicifyClient = require('servicify-client');
var getParamNames = require('get-parameter-names');

function Servicify(opts) {
  if (!(this instanceof Servicify)) return new Servicify(opts);

  this.client = new ServicifyClient(opts || {});
}

Servicify.prototype.require = function(packageName, opts) {
  var client = this.client;
  opts = opts || {};

  var exportType = opts.type || determineExportType(packageName);
  if (exportType === 'callback') {
    return function() {
      var params = [].slice.call(arguments);

      client.resolve(packageName).then(function(fn) {
        fn.apply(null, params);
      });
    };
  } else if (exportType === 'promised') {
    return function() {
      var params = [].slice.call(arguments);

      return client.resolve(packageName).then(function(fn) {
        return fn.apply(null, params);
      });
    };
  }
};

function determineExportType(packageName) {
  var ex = require(packageName);

  if (typeof ex === 'function') {
    // TODO: determine a better way than parameter name inspection for this
    var paramNames = getParamNames(ex);
    var usesCallback = paramNames[paramNames.length - 1].match(/^cb|callback$/g);
    if (usesCallback) {
      return 'callback';
    } else {
      return 'promised';
    }
  } else {
    throw new Error('unsupported package export type');
  }
}

module.exports = Servicify;