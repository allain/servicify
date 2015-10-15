var Broker = require('pigato').Broker;
var Worker = require('pigato').Worker;

var defaults = require('defaults');
var packagePath = require('package-path');
var readPkg = require('read-pkg');
var ip = require('./lib/ip');

var debug = require('debug')('servicify');
var error = require('debug')('servicify:ERROR').bind(null, '%j');

var start = require('./lib/utils').start;
var stop = require('./lib/utils').stop;
var buildInvoker = require('.//lib/invokers/');

module.exports = function (opts) {
  opts = defaults(opts, {host: '127.0.0.1', port: 2020});

  this.require = req;
  this.offer = offer;
  this.listen = listen;

  function req(requirment) {
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

    var invoker;
    if (opts && opts.type) {
      invoker = require('./lib/invokers/' + opts.type);
    } else {
      invoker = require('./lib/invokers')(require(pkgName));
    }

    return Promise.resolve(function () {
      var args = [].slice.call(arguments);

      var effectiveOpts = Object.assign({}, self.opts, opts);

      debug('sending request to server: %j %j', spec, args);
      return invoker.request(spec, args, effectiveOpts);
    });
  }

  function listen() {
    opts = defaults(opts, {
      port: 2020,
      host: ip() || '0.0.0.0'
    });

    var brokerAddress = 'tcp://' + opts.host + ':' + opts.port;

    return start(new Broker(brokerAddress)).then(function (broker) {
      broker.on('error', function (err) {
        debug('ERROR %j', err);
      });

      return {
        host: opts.host,
        port: opts.port,
        stop: function () {
          return stop(broker);
        }
      };
    });
  }

  function offer(target, spec) {
    if (typeof target === 'string') {

    } else {
      spec = parseSpec(spec);
      if (!spec.version)
        throw new Error('version must be given when offering');

      if (!spec.version.match(/^\d+\.\d+\.\d+$/))
        throw new Error('version must be specific offering');
    }

    debug('offering %s as %s@%s', target.toString(), spec.name, spec.version);

    var invoker = buildInvoker(target);
    if (!invoker)
      return Promise.reject(new Error('unsupported offering type'));

    var worker = new Worker('tcp://' + opts.host + ':' + opts.port, spec.name + '@' + spec.version);

    worker.on('error', error);

    worker.on('request', function (inp, rep, opts) {
      invoker.invoke(target, inp.args, opts).then(function (result) {
        rep.end(result);
      }, function (err) {
        rep.error(err.message);
      });
    });

    return start(worker).then(function () {
      return {
        id: worker.conf.name,
        name: spec.name,
        version: spec.version,
        type: invoker.type,
        server: {
          host: opts.host,
          port: opts.port
        },
        invoke: function () {
          return invoker.invoke(target, [].slice.call(arguments));
        },
        stop: function () {
          return stop(worker);
        }
      };
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

