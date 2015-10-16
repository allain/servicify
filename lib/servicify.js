var defaults = require('defaults');
var packagePath = require('package-path');
var readPkg = require('read-pkg');
var ip = require('./ip');

var debug = require('debug')('servicify');

var providers = require('./providers.js');

module.exports = function Servicify(requirement, opts) {
  if (typeof requirement === 'object' && opts === undefined) {
    opts = requirement;
    requirement = null;
  }

  opts = defaults(opts, {host: '127.0.0.1', port: 2020, 'driver': 'servicify-pigato'});

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

    var provider;
    if (type) {
      provider = providers[type];
    } else {
      provider = buildProvider(require(spec.name));
    }

    return function () {
      var args = [].slice.call(arguments);

      debug('sending request to server: %j %j', spec, args);

      return provider.request(spec, args, opts);
    };
  }

  function listen() {
    opts = defaults(opts, {
      port: 2020,
      host: ip() || '0.0.0.0'
    });

    return opts.driver.listen(opts).then(function (stopper) {
      return Object.assign({}, opts, {
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
        return Object.assign({
          invoke: function() {
            return invoke([].slice.call(arguments));
          },
          stop: stopper
        }, spec, opts);
      }).then(resolve);
    });
  }
};

function extractSpecForTarget(target) {
  var packageMain = require.resolve(target);
  if (!packageMain) {
    debug('unable to find required version of %j', target);
    return null;
  }

  var pkgPath = packagePath.sync(packageMain);
  if (!pkgPath) {
    debug('unable to find package for %j', target);
    return null;
  }

  var pkg = require(pkgPath + '/package.json');

  return Object.assign({
    name: pkg.name,
    version: pkg.version
  }, pkg.servicify || {});
}

function extractDeclaredDep(pkgName) {
  var projectPkg = readPkg.sync();
  return ['dependencies', 'devDependencies'].map(function (category) {
    return (projectPkg[category] || {})[pkgName];
  }).filter(Boolean)[0];
}

function parseSpec(spec) {
  if (typeof spec === 'object')
    return spec;

  if (spec.indexOf('@') === -1)
    return {
      name: spec
    };

  return {
    name: spec.substr(0, spec.indexOf('@')),
    version: spec.substr(spec.indexOf('@') + 1)
  };
}

function buildProvider(target) {
  if (typeof target === 'string') {
    target = require(target.replace(/@.*$/g, ''));
  }

  var types = Object.keys(providers);

  for (var i = 0; i < types.length; i++) {
    var type = types[i];
    if (providers[type].applies(target))
      return providers[type];
  }


}


