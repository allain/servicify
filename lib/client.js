var Promise = require('bluebird');
var debug = require('debug')('servicify-client');
var rpc = require('node-json-rpc');
var getPort = require('get-port');
var defined = require('defined');
var uniqid = require('uniqid');
var packagePath = require('package-path');

var getParamNames = require('get-parameter-names');

function ServicifyClient(opts) {
  if (!(this instanceof ServicifyClient)) return new ServicifyClient(opts);
  this.opts = opts = opts || {};

  this.opts.targetType = defined(opts.targetType, 'callback-function');

  var host = defined(this.opts.host, '127.0.0.1');
  var port = defined(this.opts.port, 2020);

  debug('using servicify-server at %s:%d', host, port);

  this.serverConnection = new rpc.Client({
    host: host,
    port: port,
    path: '/servicify',
    strict: true
  });
}

ServicifyClient.prototype.resolve = function (name, required) {
  var self = this;

  if (!required) {
    var packageMain = require.resolve(name);
    if (!packageMain) return Promise.reject(new Error('unable to find required version of ' + name));

    var parentPkg = require(packageMain.replace(/\/node_modules\/.*$/g, '') + '/package.json');
    required = ['dependencies', 'devDependencies'].map(function (cat) {
      return (parentPkg[cat] || {})[name];
    }).filter(Boolean)[0];
  }

  return callRpc(this.serverConnection, 'resolve', [name, required]).then(function (resolutions) {
    if (!resolutions.length) {
      throw new Error('no services found');
    }

    debug('resolutions for %s@%s %j', name, required, resolutions);

    // for now pick randomly
    var resolution = resolutions[Math.floor(Math.random() * resolutions.length)];

    var serviceConnection = new rpc.Client({
      host: resolution.host,
      port: resolution.port,
      path: '/servicify',
      strict: true
    });

    return function () {
      var params = [].slice.call(arguments);
      if (resolution.type === 'callback') {
        var cb = params.pop();
        return callRpc(serviceConnection, 'invoke', params).nodeify(cb);
      } else if (resolution.type === 'promised') {
        return callRpc(serviceConnection, 'invoke', params);
      } else {
        throw new Error('Unsupported resolution type: %s', resolution.type);
      }
    };
  });
};

function callRpc(client, method, params) {
  return Promise.fromNode(function (cb) {
    client.call({
      'jsonrpc': "2.0",
      'method': method,
      'params': params,
      'id': uniqid()
    }, cb);
  }).then(function (res) {
    return res.result;
  });
}

module.exports = ServicifyClient;
