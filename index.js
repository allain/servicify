var ServicifyClient = require('./lib/client');

var buildInvoker = require('./lib/invokers');
var defaults = require('defaults');

function Servicify(opts) {
  if (!(this instanceof Servicify)) return new Servicify(opts);

  this.client = new ServicifyClient(opts || {});
}

Servicify.prototype.require = function(packageName, opts) {
  var client = this.client;

  opts = defaults(opts, {});
  if (!opts.type) {
    opts.type = buildInvoker(packageName).type;
  }

  if (opts.type === 'callback-function') {
    return function() {
      var params = [].slice.call(arguments);

      client.resolve(packageName, opts).then(function(fn) {
        fn.apply(null, params);
      });
    };
  } else if (opts.type === 'promised-function') {
    return function() {
      var params = [].slice.call(arguments);

      return client.resolve(packageName, opts).then(function(fn) {
        return fn.apply(null, params);
      });
    };
  } else {
    throw new Error('Invalid export type: ' + opts.type);
  }
};

module.exports = Servicify;
