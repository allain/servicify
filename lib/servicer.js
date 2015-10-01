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
    if (target.match(/^[.]/)) { // relative path
      return Promise.reject(new Error('Relative paths are not supported for registration targets'));
    }

    var packageMain;
    try {
      packageMain = require.resolve(target);
    } catch (e) {
      return Promise.reject(e);
    }

    if (!packageMain) {
      return Promise.reject(new Error('unable to find required version of ' + target));
    }

    var pkgPath = packagePath.sync(packageMain);
    if (!pkgPath) {
      return Promise.reject(new Error('unable to find package for ' + target));
    }

    var pkg = require(pkgPath + '/package.json');
    spec = {name: pkg.name, version: pkg.version};

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
    invoker.invoke(target, inp.args, opts).then(function (result) {
      rep.end(result);
    }, function (err) {
      debug('ERROR', err);
      rep.error(err.message);
    });
  });

  return new Promise(function (resolve) {
    worker.once('start', function () {
      resolve({
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
              debug('stopped worker', worker.conf.name);
              resolve();
            });

            debug('stopping worker', worker.conf.name);
            worker.stop();
          });
        }
      });
    });

    worker.start();
  });
};

module.exports = ServicifyServicer;
