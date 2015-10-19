var defaults = require('defaults');
var packagePath = require('package-path');
var readPkg = require('read-pkg');
var ip = require('./ip');

var debug = require('debug')('servicify');

var providers = {
  'callback-function': require('./providers/callback-function'),
  'promised-function': require('./providers/promised-function')
};

var objectAssign = Object.assign || require('object-assign');
var objectValues = Object.values || require('object-values');
var find = require('array-find');

module.exports = function Servicify(requirement, opts) {
  if (typeof requirement === 'object' && opts === undefined) {
    opts = requirement;
    requirement = null;
  }

  opts = defaults(opts, {'driver': 'servicify-http'});

  if (typeof opts.driver === 'string')
    opts.driver = require(opts.driver);

  opts.driver = opts.driver(opts);

  if (requirement)
    return req(requirement);

  req.opts = opts;
  req.require = req;
  req.offer = offer;
  req.listen = listen;

  return req;

  function req(spec, type) {
    spec = parseSpec(spec);
    if (!spec.version)
      spec.version = extractDeclaredDep(spec.name);

    var provider = providers[type] || buildProvider(require(spec.name));

    return function () {
      var args = [].slice.call(arguments);

      debug('sending request to server: %j %j', spec, args);

      return provider.dispatch(spec, args, opts);
    };
  }

  function listen() {
    opts = defaults(opts, {
      port: 2020,
      host: ip() || '0.0.0.0'
    });

    return opts.driver.listen(opts).then(function (stopper) {
      return objectAssign({}, opts, {
        stop: stopper
      });
    });
  }

  function offer(target, spec) {
    return new Promise(function (resolve) {
      if (typeof target === 'string') {
        spec = extractSpecForTarget(target);
        target = require(target);
      } else if (spec) {
        spec = parseSpec(spec);
        if (!spec.version)
          throw new Error('version must be given when offering');

        if (!spec.version.match(/^\d+\.\d+\.\d+$/))
          throw new Error('version must be specific offering');
      } else {
        throw new Error('spec not given with offer');
      }

      debug('offering %s as %s@%s', target.toString(), spec.name, spec.version);

      var provider = buildProvider(target);
      if (!provider)
        return Promise.reject(new Error('unsupported offering type'));

      var invoke = provider.invoke.bind(null, target);

      return opts.driver.offer(spec, invoke, opts).then(function (stopper) {
        return objectAssign({
          invoke: function() {
            return invoke([].slice.call(arguments));
          },
          stop: function() {
            return Promise.resolve(stopper());
          }
        }, spec, opts);
      }).then(resolve);
    });
  }
};

function extractSpecForTarget(target) {
  var packageMain = require.resolve(target);
  if (!packageMain)
    throw new Error('unable to find required version of ' + target);

  var pkgPath = packagePath.sync(packageMain);
  if (!pkgPath)
    throw new Error('unable to find package for' + target);

  var pkg = require(pkgPath + '/package.json');

  return objectAssign({
    name: pkg.name,
    version: pkg.version
  }, pkg.servicify || {});
}

function extractDeclaredDep(pkgName) {
  var projectPkg = readPkg.sync();
  return (projectPkg.dependencies || {})[pkgName] || (projectPkg.devDependencies || {})[pkgName];
}

function buildProvider(target) {
  if (typeof target === 'string')
    target = require(parseSpec(target).name);

  return find(objectValues(providers), function(provider) {
    return provider.applies(target);
  });
}

function parseSpec(spec) {
  if (typeof spec === 'object')
    return spec;

  if (spec.indexOf('@') === -1)
    return { name: spec };

  return {
    name: spec.substr(0, spec.indexOf('@')),
    version: spec.substr(spec.indexOf('@') + 1)
  };
}




