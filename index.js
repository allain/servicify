var ServicifyClient = require('./lib/client');

var buildInvoker = require('./lib/invokers');

function Servicify(opts) {
  if (!(this instanceof Servicify)) return new Servicify(opts);

  this.client = new ServicifyClient(opts || {});
}

Servicify.prototype.require = function(packageName, opts) {
  var client = this.client;
  opts = opts || {};

  var exportType = opts.type || buildInvoker(packageName).type;

  if (exportType === 'callback-function') {
    return function() {
      var params = [].slice.call(arguments);

      client.resolve(packageName).then(function(fn) {
        fn.apply(null, params);
      });
    };
  } else if (exportType === 'promised-function') {
    return function() {
      var params = [].slice.call(arguments);

      return client.resolve(packageName).then(function(fn) {
        return fn.apply(null, params);
      });
    };
  }
};

module.exports = Servicify;