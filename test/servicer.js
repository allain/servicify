var test = require('blue-tape');
var debug = require('debug')('servicify-servicer-test');

var Promise = require('native-promise-only');
var rpc = require('node-json-rpc');
var uniqid = require('uniqid');
var eventBefore = require('promise-event-before');

var useServer = require('./fixtures/use-server');

var ServicifyServicer = require('../lib/servicer');

test('servicer - can be created without a server to connect to yet', function (t) {
  var ps = new ServicifyServicer();
  t.ok(ps instanceof ServicifyServicer);
  t.end();
});

test('servicer - returned service has expected API', function (t) {
  return useServer(function (server) {
    var identity = require('async-identity');

    return new ServicifyServicer(server).offer(identity, {name: 'async-identity', version: '1.0.0'}).then(function (service) {
      t.ok(service.host, 'has host');
      t.ok(service.port, 'has port');
      t.equal(service.load, 0, '0 load');
      t.equal(typeof service.invoke, 'function', 'has invoke function');
      t.deepEqual(service.server, {host: server.host, port: server.port}, 'has server location');
      return service.stop();
    });
  });
});

test('servicer - supports registering a function that returns promises', function (t) {
  return useServer(function (server) {
    var identity = function (x) {
      return Promise.resolve(x);
    };

    return new ServicifyServicer(server).offer(identity, {name: 'identity', version: '1.0.0'}).then(function (service) {
      t.equal(typeof service.invoke, 'function', 'has invoke function');
      return service.invoke(10).then(function (result) {
        t.equal(result, 10);
        return service.stop();
      });
    });
  });
});

test('servicer - supports registering a package by name', function (t) {
  return useServer(function (server) {
    return new ServicifyServicer(server).offer('async-identity').then(function (service) {
      t.ok(service.host, 'has host');
      t.ok(service.port, 'has port');
      return service.stop();
    });
  });
});

test('servicer - supports registering a package by its absolute directory', function (t) {
  return useServer(function (server) {
    return new ServicifyServicer(server).offer(__dirname + '/../node_modules/async-identity').then(function (service) {
      t.ok(service.host);
      t.ok(service.port);
      return service.stop();
    });
  });
});

test('servicer - rejects registering a package by its relative directory', function (t) {
  return useServer(function () {
    return new ServicifyServicer().offer('../node_modules/async-identity').catch(function (err) {
      t.ok(err);
    });
  });
});

test('servicer - exposes async-callback function through rpc', function (t) {
  return useServer(function (server) {
    var identity = require('async-identity');

    return new ServicifyServicer(server).offer(identity, {name: 'async-identity', version: '1.0.0'}).then(function (service) {
      var client = new rpc.Client({
        host: service.host,
        port: service.port,
        path: '/servicify',
        strict: true
      });

      return callRpc(client, 'invoke', [10]).then(function (result) {
        t.equal(result, 10);
        return service.stop();
      });
    });
  });
});

test('servicer - exposes async-promise function through rpc', function (t) {
  return useServer(function(server) {
    var identity = function (x) {
      return Promise.resolve(x);
    };

    return new ServicifyServicer(server).offer(identity, {name: 'identity', version: '1.0.0'}).then(function (service) {
      var client = new rpc.Client({
        host: service.host,
        port: service.port,
        path: '/servicify',
        strict: true
      });

      return callRpc(client, 'invoke', [10]).then(function (result) {
        t.equal(result, 10);
        return service.stop();
      });
    });
  });
});

test.skip('servicer - invocations effect load between heartbeats', function (t) {
  return useServer(function (server) {
    var servicer = new ServicifyServicer({host: server.host, port: server.port, heartbeat: 10});
    var identity = require('async-identity');

    return servicer.offer(identity, {name: 'async-identity', version: '1.0.0'}).then(function (service) {
      var client = new rpc.Client({
        host: service.host,
        port: service.port,
        path: '/servicify',
        strict: true
      });

      return Promise.all([
        callRpc(client, 'invoke', [1]),
        callRpc(client, 'invoke', [2]),
        callRpc(client, 'invoke', [3])
      ]).then(function () {
        return eventBefore(servicer, 'heartbeat', 100);
      }).then(function (heartbeat) {
        t.ok(heartbeat.load > 0, 'load should be greater than 0');
        return eventBefore(servicer, 'heartbeat', 100);
      }).then(function (heartbeat) {
        t.equal(heartbeat.load, 0, 'load should be zero');
        return service.stop();
      });
    });
  });
});

test('servicer - returned service has expected API', function (t) {
  return useServer(function (server) {
    var servicer = new ServicifyServicer({host: server.host, port: server.port, heartbeat: 10});
    var identity = require('async-identity');

    return servicer.offer(identity, {name: 'async-identity', version: '1.0.0'}).then(function (service) {
      t.ok(service.host, 'has host');
      t.ok(service.port, 'has port');
      t.equal(service.load, 0, '0 load');
      t.equal(typeof service.invoke, 'function', 'has invoke function');
      t.ok(service.server, 'has server info');
      t.ok(service.server.host, 'has server host');
      t.ok(service.server.port, 'has server port');
      return service.stop();
    });
  });
});

test('servicer - can be invoked through the servicify server', function(t) {
  return useServer(function(server) {
    return new ServicifyServicer(server).offer('async-identity').then(function(service) {
      t.ok(service.id, 'service should have an id assigned to it');

      var serverClient = new rpc.Client({
        port: server.port,
        host: server.host,
        path: '/servicify',
        strict: true
      });

      return callRpc(serverClient, 'invoke', [service.id, [20]]).then(function (result) {
        t.equal(result, 20);
        return service.stop();
      });
    });
  });
});

test('servicer - throws when offered is not a package name and no spec is given', function(t) {
  return new ServicifyServicer().offer(function() {}).catch(function(err) {
    t.ok(err instanceof Error);
    t.equal(err.message, 'spec not given with offer');
  });
});

test.only('servicer - when error occurs in servicer, error flows through when proxing', function(t) {
  return useServer(function(server) {
    return new ServicifyServicer(server).offer(function() { return Promise.reject(new Error('error')); }, {name: 'a', version: '1.0.0'}).then(function(service) {
      var serverClient = new rpc.Client({
        port: server.port,
        host: server.host,
        path: '/servicify',
        strict: true
      });

      return callRpc(serverClient, 'invoke', [service.id, [20]]).catch(function (err) {
        t.ok(err instanceof Error);
        t.equal(err.message, 'error');
        return service.stop();
      });
    });
  });
});

function callRpc(client, method, params) {
  return new Promise(function(resolve, reject) {
    client.call({
      'jsonrpc': '2.0',
      'method': method,
      'params': params,
      'id': uniqid()
    }, function(err, res) {
      debug('rpc http response received: %j', res);
      if (err) return reject(err);
      if (res.error) return reject(new Error(res.error.message));
      resolve(res.result);
    });
  });
}
