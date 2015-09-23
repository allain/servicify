var test = require('blue-tape');
var Promise = require('bluebird');
var rpc = require('node-json-rpc');
var uniqid = require('uniqid');

var offerService = require('./fixtures/offer-service');
var useServicer = require('./fixtures/use-servicer');
var useServer = require('./fixtures/use-server');

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
    return ServicifyClient().resolve('promise-identity', '^1.1.1').then(function(fn) {
      return fn(10).then(function(val) {
        t.equal(val, 10);
      });
    });
  });
});

test('client - invocations affects load between heartbeats', function (t) {
  return offerService('promise-identity', function (service) {
      var startLoad = service.load;

    return ServicifyClient().resolve('promise-identity', '^1.1.1').then(function(fn) {
      return Promise.all([fn(1), fn(2), fn(3)]).then(function() {
        return eventBefore(servicer, 'heartbeat', 20);
      }).then(function () {
        t.ok(startLoad < service.load, startLoad + ' load < ' + service.load + ' load');
        return eventBefore(servicer, 'heartbeat', 20);
      }).then(function () {
        t.equal(service.load, 0);
      });
    });
  });
});

test('client - will go through server if direct connection fails', function(t) {
  return useServer(function(server) {
    return new ServicifyServicer().offer(require('promise-identity'),
    {name: 'promise-identity', version: '1.1.1', host: '192.168.1.254'}).then(function(service) {
      return new ServicifyClient().resolve('promise-identity', '1.1.1').then(function(fn) {
        return fn(10).then(function(result) {
          t.equal(result, 10);
          return service.stop();
        });
      });
    });
  })
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