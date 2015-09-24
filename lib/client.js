var Promise = require('bluebird');
var debug = require('debug')('servicify-client');
var rpc = require('node-json-rpc');
var defaults = require('defaults');
var uniqid = require('uniqid');

var portChecker = require('portchecker');

function ServicifyClient(opts) {
  if (!(this instanceof ServicifyClient)) return new ServicifyClient(opts);
  var opts = this.opts = defaults(opts || {}, {
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
        var params = [].slice.call(arguments);
        if (!direct) {
          params = [resolution.id, params];
        }

        if (resolution.type === 'callback') {
          var cb = params.pop();
          return callRpc(connection, 'invoke', params).nodeify(cb);
        } else if (resolution.type === 'promised') {
          return callRpc(connection, 'invoke', params);
        }

        throw new Error('Unsupported resolution type: %s', resolution.type);
      };
    })
  });

  function getResolutions(pkgName, required) {
    return callRpc(self.serverConnection, 'resolve', [pkgName, required]);
  }
};



function extractDeclaredDep(pkgName) {
  var packageMain = require.resolve(pkgName);
  if (!packageMain) return Promise.reject(new Error('unable to find required version of ' + name));

  var projectPkg = require(packageMain.replace(/\/node_modules\/.*$/g, '') + '/package.json');

  return ['dependencies', 'devDependencies'].map(function (category) {
    return (projectPkg[category] || {})[pkgName];
  }).filter(Boolean)[0];
}

function canConnect(host, port) {
  return new Promise(function (resolve) {
    if (host === '127.0.0.1' || host === '0.0.0.0') {
      return resolve(true);
    }
    portChecker.isOpen(port, host, function (result) {
      resolve(result);
    });
  });
}

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
