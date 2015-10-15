var Promise = require('native-promise-only');
var debug = require('debug')('servicify-servicer');
var packagePath = require('package-path');
var defaults = require('defaults');
var ip = require('./ip');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var buildInvoker = require('./invokers');
var Worker = require('pigato').Worker;
var start = require('./utils').start;
var stop = require('./utils').stop;


function ServicifyServicer(opts) {
  if (!(this instanceof ServicifyServicer)) return new ServicifyServicer(opts);

  EventEmitter.call(this);

  this.opts = opts = defaults(opts, {
    host: ip() || '127.0.0.1',
    port: 2020,
    heartbeat: 10000
  });

  debug('using servicify-server at %s:%d', opts.host, opts.port);
}

util.inherits(ServicifyServicer, EventEmitter);

ServicifyServicer.prototype.offer = function (target, spec) {
  var self = this;

  if (typeof target === 'string') {
    spec = spec || extractSpecForTarget(target);
    if (!spec) {
      return Promise.reject(new Error('spec could not be extracted from target'));
    }
    target = require(target);
  } else if (typeof spec !== 'object') {
    return Promise.reject(new Error('spec not given with offer'));
  }

  debug('offering %s as %j', target.toString(), spec);

  var invoker = buildInvoker(target);
  if (!invoker) {
    return Promise.reject(new Error('unsupported target type'));
  }

  var worker = new Worker('tcp://' + this.opts.host + ':' + this.opts.port, spec.name + '@' + spec.version);

  worker.on('error', function(err) {
    debug('ERROR: %j', err);
  });

  worker.on('request', function (inp, rep, opts) {
    invoker.invoke(target, inp.args, opts).then(function (result) {
      rep.end(result);
    }, function (err) {
      rep.error(err.message);
    });
  });

  return start(worker).then(function () {
    debug('worker started: %j', spec);
    return Object.assign({
      id: worker.conf.name,
      name: spec.name,
      version: spec.version,
      type: invoker.type,
      server: {
        host: self.opts.host,
        port: self.opts.port
      },
      invoke: function () {
        return invoker.invoke(target, [].slice.call(arguments));
      },
      stop: function () {
        return stop(worker);
      }
    }, spec);
  });
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

module.exports = ServicifyServicer;
