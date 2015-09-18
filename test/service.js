var test = require('blue-tape');

var Promise = require('bluebird');
var rpc = require('node-json-rpc');
var uniqid = require('uniqid');
var eventBefore = require('promise-event-before');
var ServicifyServer = require('../lib/server');
var ServicifyService = require('../lib/service');

test('service - can be created without a server to connect to yet', function (t) {
  var ps = new ServicifyService();
  t.ok(ps instanceof ServicifyService);
  t.end();
});

test('service - returned service has expected API', function (t) {
  return new ServicifyServer().listen().then(function (server) {
    var ps = new ServicifyService();
    var identity = require('async-identity');

    return ps.offer(identity, {name: 'async-identity', version: '1.0.0'}).then(function (service) {
      t.ok(service.host, 'has host');
      t.ok(service.port, 'has port');
      t.equal(service.load, 0, '0 load');
      t.equal(typeof service.invoke, 'function', 'has invoke function');
      t.deepEqual(service.server, {host: server.host, port: server.port}, 'has server location');
      return service.stop();
    }).then(function () {
      return server.stop();
    });
  });
});

test('service - supports registering a function that returns promises', function(t) {
  return new ServicifyServer().listen().then(function(server) {
    var ps = new ServicifyService();
    var identity = function(x) { return Promise.resolve(x); }

    return ps.offer(identity, {name: 'identity', version: '1.0.0'}).then(function (service) {
      t.equal(typeof service.invoke, 'function', 'has invoke function');
      return service.invoke([10]).then(function(result) {
        t.equal(result, 10);
        return service.stop();
      }).then(function () {
        return server.stop();
      });
    });
  })
});

test('service - supports registering a package by name', function (t) {
  return new ServicifyServer().listen().then(function (server) {
    var ps = new ServicifyService();

    return ps.offer('async-identity').then(function (service) {
      t.ok(service.host, 'has host');
      t.ok(service.port, 'has port');
      return service.stop();
    }).then(function () {
      return server.stop();
    });
  });
});

test('service - supports registering a package by its absolute directory', function (t) {
  return new ServicifyServer().listen().then(function (server) {
    var ps = new ServicifyService();

    return ps.offer(__dirname + '/../node_modules/async-identity').then(function (service) {
      t.ok(service.host);
      t.ok(service.port);
      return service.stop();
    }).then(function () {
      return server.stop();
    });
  });
});

test('service - rejects registering a package by its relative directory', function (t) {
  return new ServicifyServer().listen().then(function (server) {
    var ps = new ServicifyService();

    return ps.offer('../node_modules/async-identity').catch(function (err) {
      t.ok(err);
      return server.stop();
    });
  });
});

test('service - exposes async-callback function through rpc', function (t) {
  return new ServicifyServer().listen().then(function (server) {
    var ps = new ServicifyService();
    var identity = require('async-identity');

    return ps.offer(identity, {name: 'async-identity', version: '1.0.0'}).then(function (service) {
      var client = new rpc.Client({
        host: service.host,
        port: service.port,
        path: '/porty',
        strict: true
      });

      return callRpc(client, 'invoke', [10]).then(function (result) {
        t.equal(result, 10);
        return service.stop();
      }).then(function () {
        return server.stop();
      });
    });
  });
});

test('service - exposes async-promise function through rpc', function (t) {
  return new ServicifyServer().listen().then(function (server) {
    var ps = new ServicifyService();
    var identity = function(x) { return Promise.resolve(x); }

    return ps.offer(identity, {name: 'identity', version: '1.0.0'}).then(function (service) {
      var client = new rpc.Client({
        host: service.host,
        port: service.port,
        path: '/porty',
        strict: true
      });

      return callRpc(client, 'invoke', [10]).then(function (result) {
        t.equal(result, 10);
        return service.stop();
      }).then(function () {
        return server.stop();
      });
    });
  });
});

test('service - invocations affects load between heartbeats', function (t) {
  return new ServicifyServer().listen().then(function (server) {
    var ps = new ServicifyService({heartbeat: 10});
    var identity = require('async-identity');

    return ps.offer(identity, {name: 'async-identity', version: '1.0.0'}).then(function (service) {
      var client = new rpc.Client({
        host: service.host,
        port: service.port,
        path: '/porty',
        strict: true
      });

      return Promise.all([
        callRpc(client, 'invoke', [1]),
        callRpc(client, 'invoke', [2]),
        callRpc(client, 'invoke', [3])
      ]).then(function () {
        return eventBefore(ps, 'heartbeat', 100);
      }).then(function (heartbeat) {
        t.ok(heartbeat.load > 0);
        return eventBefore(ps, 'heartbeat', 100);
      }).then(function (heartbeat) {
        t.equal(heartbeat.load, 0);
        return service.stop();
      }).then(function () {
        return server.stop();
      });
    });
  });
});

function callRpc(client, method, params) {
  return Promise.fromNode(function (cb) {
    client.call({
      'jsonrpc': '2.0',
      'method': method,
      'params': params,
      'id': uniqid()
    }, cb);
  }).then(function (res) {
    return res.result;
  });
}