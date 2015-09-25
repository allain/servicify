var npm = require('npm');
var uniqid = require('uniqid');
var rpc = require('node-json-rpc');
var Promise = require('native-promise-only');

var ServicifyServicer = require('../../lib/servicer');

module.exports = function (argv) {
  var serverHost = argv.host || '127.0.0.1';
  var serverPort = argv.port || 2020;

  var serviceConnection = new rpc.Client({
    host: serverHost,
    port: serverPort,
    path: '/servicify',
    strict: true
  });

  var name = argv._[1];
  var required = argv._[2] || '*';

  callRpc(serviceConnection, 'resolve', [name, required]).then(function(resolutions) {
    resolutions.sort(function(a, b) {
      return a.load - b.load;
    });
    resolutions.forEach(function(r) {
      console.log(r.host + ':' + r.port, r.name + '@' + r.version, 'with load', r.load);
    });
  });
};

function callRpc(client, method, params) {
  return new Promise(function(resolve, reject) {
    client.call({
      'jsonrpc': "2.0",
      'method': method,
      'params': params,
      'id': uniqid()
    }, function(err, res) {
      if (err) return reject(err);
      if (res.error) return reject(new Error(err.error.message));

      resolve(res.result);
    });
  });
}
