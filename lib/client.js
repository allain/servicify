var Promise = require('native-promise-only');
var defaults = require('defaults');
var buildInvoker = require('./invokers');
var readPkg = require('read-pkg');

function ServicifyClient(opts) {
  if (!(this instanceof ServicifyClient)) return new ServicifyClient(opts);

  this.opts = opts = defaults(opts, {
    host: '127.0.0.1',
    port: 2020
  });
}

ServicifyClient.prototype.stop = function() {
  return Promise.resolve();
};

ServicifyClient.prototype.resolve = function (spec) {
  var pkgName;
  var semverRange;
  if (spec.indexOf('@') === -1) {
    pkgName = spec;
    semverRange = extractDeclaredDep(pkgName);
    spec = pkgName + '@' + semverRange;
  } else {
    pkgName  = spec.substr(0, spec.indexOf('@'));
    semverRange = spec.substr(spec.indexOf('@') + 1);
  }

  var invoker = buildInvoker(require(pkgName));

  return Promise.resolve(function() {
    var args = [].slice.call(arguments);
    return invoker.request(spec, args);
  });
};

function extractDeclaredDep(pkgName) {
  var projectPkg = readPkg.sync();
  return ['dependencies', 'devDependencies'].map(function (category) {
    return (projectPkg[category] || {})[pkgName];
  }).filter(Boolean)[0];
}

module.exports = ServicifyClient;
