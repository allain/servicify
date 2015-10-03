var Promise = require('native-promise-only');
var debug = require('debug')('servicify-servicer');
var packagePath = require('package-path');
var defaults = require('defaults');
var ip = require('./ip');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var buildInvoker = require('./invokers');

var Worker = require('pigato').Worker;

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
    target = require(target);
  } else if (typeof spec !== 'object') {
    return Promise.reject(new Error('spec not given with offer'));
  }

  debug('offering %s@%s', spec.name, spec.version);

  var invoker = buildInvoker(target);
  if (!invoker) {
    throw new Error('unsupported target type');
  }

  var worker = new Worker('tcp://' + this.opts.host + ':' + this.opts.port, spec.name + '@' + spec.version);
  worker.on('error', function (e) {
    console.log('ERROR', e);
  });
  worker.on('request', function (inp, rep, opts) {
    debug('processing request %j with offering %j', inp, spec);
    invoker.invoke(target, inp.args, opts).then(function (result) {
      rep.end(result);
    }, function (err) {
      debug('ERROR', err);
      rep.error(err.message);
    });
  });

  return new Promise(function (resolve) {
    worker.once('start', function () {
      resolve(Object.assign({
        id: worker.conf.name,
        name: spec.name,
        version: spec.version,
        type: invoker.type,
        server: {
          host: self.opts.host,
          port: self.opts.port
        },
        invoke: function () {
          var args = [].slice.call(arguments);
          return invoker.invoke(target, args);
        },
        stop: function () {
          return new Promise(function (resolve) {
            worker.once('stop', function () {
              resolve();
            });
            worker.stop();
          });
        }
      }, spec));
    });

    worker.start();
  });
};

function extractSpecForTarget(target) {
  var packageMain = target;
  if (packageMain[0] !== '/') {
    try {
      if (target[0] === '/') {
        packageMain = target;
      } else {
        packageMain = require.resolve(target);
      }
    } catch (e) {
      return Promise.reject(e);
    }
  }

  if (!packageMain) {
    return Promise.reject(new Error('unable to find required version of ' + target));
  }

  var pkgPath = packagePath.sync(packageMain);
  if (!pkgPath) {
    return Promise.reject(new Error('unable to find package for ' + target));
  }

  var pkg = require(pkgPath + '/package.json');

  var spec = {name: pkg.name, version: pkg.version};
  return Object.assign(spec, pkg.servicify || {});
}

module.exports = ServicifyServicer;
