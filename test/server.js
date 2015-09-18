var ServicifyServer = require('../lib/server');
var Promise = require('bluebird');

var test = require('blue-tape');

var rpc = require('node-json-rpc');

test('server - can be created without options', function (t) {
  var server = new ServicifyServer();
  t.ok(server instanceof ServicifyServer);
  t.end();
});

test('server - supports lifecycle without arguments', function (t) {
  return new ServicifyServer().listen().then(function (srv) {
    t.ok(srv);
    t.ok(srv.host);
    t.equal(srv.port, 2020);
    return srv.stop();
  });
});

test('server - server has expected api', function(t) {
  return new ServicifyServer().listen().then(function (srv) {
    t.ok(srv.host);
    t.equal(srv.port, 2020);
    t.equal(typeof srv.resolve, 'function');
    t.equal(typeof srv.rescind, 'function');
    t.equal(typeof srv.offer, 'function');
    return srv.stop();
  });
});

test('server - is exposed as an rpc endpoints', function (t) {
  return new ServicifyServer().listen().then(function (srv) {
    var client = new rpc.Client({
      port: 2020,
      host: srv.host,
      path: '/',
      strict: true
    });

    return callRpc(client, 'offer', [
      {name: 'a', version: '1.2.3', host: '127.0.0.1', port: 2021, expires: 1}
    ]).then(function (offering) {
      t.equal(offering.name, 'a');
      t.equal(offering.version, '1.2.3');
      t.equal(offering.host, '127.0.0.1');
      t.equal(offering.port, 2021);
      t.equal(offering.expires, 1);
      return callRpc(client, 'resolve', ['a', '^1.0.0']);
    }).then(function (offerings) {
      t.equal(offerings.length, 1);
      t.equal(offerings[0].name, 'a');
      t.equal(offerings[0].version, '1.2.3');
      t.equal(offerings[0].host, '127.0.0.1');
      t.equal(offerings[0].port, 2021);
      t.equal(offerings[0].expires, 1);

      return callRpc(client, 'rescind', ['a', '^1.2.3']);
    }).then(function (rescinded) {
      t.equal(rescinded.length, 1);
      t.equal(rescinded[0].name, 'a');
      t.equal(rescinded[0].version, '1.2.3');
      t.equal(rescinded[0].host, '127.0.0.1');
      t.equal(rescinded[0].port, 2021);
      t.equal(rescinded[0].expires, 1);
      return callRpc(client, 'resolve', ['a', '^1.0.0']);
    }).then(function (offerings) {
      t.deepEqual(offerings, []);
    }).then(function() {
      return srv.stop();
    });
  });
});

function callRpc(client, method, args) {
  return new Promise(function (resolve, reject) {
    client.call({
      'jsonrpc': '2.0',
      'method': method,
      'params': args,
      'id': 1
    }, function (err, res) {
      if (err) return reject(err);

      resolve(res.result);
    });
  });
}
