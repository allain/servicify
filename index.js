var ServicifyClient = require('./lib/client');

var buildInvoker = require('./lib/invokers');
var defaults = require('defaults');

function Servicify(opts) {
  if (!(this instanceof Servicify)) return new Servicify(opts);

  this.client = new ServicifyClient(opts || {});
}

Servicify.prototype.require = function(packageName, opts) {
  var client = this.client;

  opts = opts || {};

  var invoker;
  if (opts.type) {
    invoker = require('./lib/invokers/' + opts.type);
  } else {
    invoker = buildInvoker(packageName);
  }

  return invoker.build(client.resolve(packageName, opts));
};

module.exports = Servicify;
