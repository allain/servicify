var Promise = require('native-promise-only');
var debug = require('debug')('servicify-client');
var rpc = require('node-json-rpc');
var defaults = require('defaults');
var uniqid = require('uniqid');

var tcpp = require('tcp-ping');

function ServicifyClient(opts) {
  if (!(this instanceof ServicifyClient)) return new ServicifyClient(opts);
  
  this.opts = opts = defaults(opts || {}, {
    targetType: 'callback-function',
    host: '127.0.0.1',
    port: 2020
  });

  debug('using servicify-server at %s:%d', opts.host, opts.port);

  this.serverConnection = new rpc.Client({
    host: opts.host,
    port: opts.port,
    path: '/servicify',
    strict: true
  });
}

ServicifyClient.prototype.resolve = function (pkgName, required) {
  var self = this;

  required = required || extractDeclaredDep(pkgName);

  return getResolutions(pkgName, required).then(function (resolutions) {
    if (!resolutions.length) {
      throw new Error('no services found');
    }

    // for now pick randomly
    var resolution = resolutions[Math.floor(Math.random() * resolutions.length)];

    return canConnect(resolution.host, resolution.port).then(function (direct) {
      var connection = direct ? new rpc.Client({
        host: resolution.host,
        port: resolution.port,
        path: '/servicify'
      }) : self.serverConnection;

      return function () {
        var args = [].slice.call(arguments);

        return require('./invokers/' + resolution.type).rpc(connection, direct ? args : [resolution.id, args]);
      };
    });
  });

  function getResolutions(pkgName, required) {
    return callRpc(self.serverConnection, 'resolve', [pkgName, required]);
  }
};



function extractDeclaredDep(pkgName) {
  var packageMain = require.resolve(pkgName);
  if (!packageMain) {
    return Promise.reject(new Error('unable to find required version of ' + pkgName));
  }

  var projectPkg = require(packageMain.replace(/\/node_modules\/.*$/g, '') + '/package.json');

  return ['dependencies', 'devDependencies'].map(function (category) {
    return (projectPkg[category] || {})[pkgName];
  }).filter(Boolean)[0];
}

function canConnect(host, port) {
  return new Promise(function (resolve, reject) {
    if (host === '127.0.0.1' || host === '0.0.0.0') {
      return resolve(true);
    }

    tcpp.ping({address: host, port: port, timeout: 500, attempts: 1}, function(err, data) {
      return err ? reject(err) : resolve(data.min !== undefined);
    });
  });
}

function callRpc(client, method, params) {
  return new Promise(function(resolve, reject) {
    client.call({
      'jsonrpc': '2.0',
      'method': method,
      'params': params,
      'id': uniqid()
    }, function(err, res) {
      if (err) return reject(err);

      if (res.error) return reject(err.error.message);

      resolve(res.result);
    });
  });
}

module.exports = ServicifyClient;
