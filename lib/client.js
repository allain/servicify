var Promise = require('native-promise-only');
var defaults = require('defaults');
var buildInvoker = require('./invokers');
var readPkg = require('read-pkg');
var debug = require('debug')('servicify-client');

function ServicifyClient(opts) {
  if (!(this instanceof ServicifyClient)) return new ServicifyClient(opts);

  this.opts = opts = defaults(opts, {
    host: '127.0.0.1',
    port: 2020
  });
}

ServicifyClient.prototype.stop = function () {
  return Promise.resolve();
};

ServicifyClient.prototype.resolve = function (spec, opts) {
  var self = this;
  var invoker;

  var pkgName;
  var semverRange;
  if (spec.indexOf('@') === -1) {
    pkgName = spec;
    semverRange = extractDeclaredDep(pkgName);
    spec = pkgName + '@' + semverRange;
  } else {
    pkgName = spec.substr(0, spec.indexOf('@'));
    semverRange = spec.substr(spec.indexOf('@') + 1);
  }

  if (opts && opts.type) {
    invoker = require('./invokers/' + opts.type);
  } else {
    invoker = buildInvoker(require(pkgName));
  }

  return Promise.resolve(function () {
    var args = [].slice.call(arguments);

    var effectiveOpts = Object.assign({}, self.opts, opts);

    debug('sending request to server: %j %j', spec, args);
    return invoker.request(spec, args, effectiveOpts);
  });
};

function extractDeclaredDep(pkgName) {
  var projectPkg = readPkg.sync();
  return ['dependencies', 'devDependencies'].map(function (category) {
    return (projectPkg[category] || {})[pkgName];
  }).filter(Boolean)[0];
}

module.exports = ServicifyClient;
