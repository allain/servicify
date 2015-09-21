var test = require('blue-tape');
var Promise = require('bluebird');
var rpc = require('node-json-rpc');
var uniqid = require('uniqid');

var offerService = require('./fixtures/offer-service');
var useServicer = require('./fixtures/use-servicer');

var ServicifyClient = require('../lib/client');
var ServicifyServicer = require('../lib/servicer');
var eventBefore = require('promise-event-before');

test('client - can be created without a server to connect to yet', function (t) {
  var ps = new ServicifyClient();
  t.ok(ps instanceof ServicifyClient);
  t.end();
});

test('client - supports registering a function that returns promises', function (t) {
  return offerService(require('promise-identity'), {
    name: 'promise-identity',
    version: '1.1.1'
  }, function (service) {
    var client = ServicifyClient();
    return client.resolve('promise-identity', '^1.1.1').then(function(fn) {
      return fn(10).then(function(val) {
        t.equal(val, 10);
      });
    });
  });
});

test('client - supports registering a package by name', function (t) {
  return offerService('async-identity', function (service) {
    t.ok(service.host, 'has host');
    t.ok(service.port, 'has port');
  });
});

test('client - supports registering a package by its absolute directory', function (t) {
  return offerService(__dirname + '/../node_modules/async-identity', function (service) {
    t.ok(service.host);
    t.ok(service.port);
  });
});

test('client - rejects registering a package by its relative directory', function (t) {
  return useServicer(function(servicer) {
    return servicer.offer('../node_modules/async-identity').catch(function (err) {
      t.ok(err instanceof Error, 'rejected offer');
    });
  });
});

test('client - exposes async-callback function through rpc', function (t) {
  return offerService('async-identity', function (service) {
    var client = new rpc.Client({
      host: service.host,
      port: service.port,
      path: '/servicify',
      strict: true
    });

    return callRpc(client, 'invoke', [10]).then(function (result) {
      t.equal(result, 10);
    });
  });
});

test('client - exposes async-promise function through rpc', function (t) {
  return offerService('promise-identity', function (service) {
    var client = new rpc.Client({
      host: service.host,
      port: service.port,
      path: '/servicify',
      strict: true
    });

    return callRpc(client, 'invoke', [10]).then(function (result) {
      t.equal(result, 10);
    });
  });
});


test('client - invocations affects load between heartbeats', function (t) {
  return useServicer({heartbeat: 10}, function (servicer) {
    var identity = require('async-identity');

    return servicer.offer(identity, {name: 'async-identity', version: '1.0.0'}).then(function (service) {
      var client = new rpc.Client({
        host: service.host,
        port: service.port,
        path: '/servicify',
        strict: true
      });

      var startLoad = service.load;

      return Promise.all([
        callRpc(client, 'invoke', [1]),
        callRpc(client, 'invoke', [2]),
        callRpc(client, 'invoke', [3])
      ]).then(function () {
        return eventBefore(servicer, 'heartbeat', 20);
      }).then(function () {
        t.ok(startLoad < service.load, startLoad + ' load < ' + service.load + ' load');
        return eventBefore(servicer, 'heartbeat', 20);
      }).then(function () {
        t.equal(service.load, 0);
        return service.stop();
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
    return res ? res.result : undefined;
  });
}