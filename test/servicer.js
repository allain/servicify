var test = require('blue-tape');

var Promise = require('bluebird');
var rpc = require('node-json-rpc');
var uniqid = require('uniqid');
var eventBefore = require('promise-event-before');

var useServer = require('./fixtures/use-server');

var ServicifyServicer = require('../lib/servicer');

test('servicer - can be created using factory function', function (t) {
  var servicer = ServicifyServicer();
  t.ok(servicer instanceof ServicifyServicer);
  t.end();
});

test('servicer - can be created without a server to connect to yet', function (t) {
  var servicer = new ServicifyServicer();
  t.ok(servicer instanceof ServicifyServicer);
  t.end();
});

test('servicer - returned service has expected API', function (t) {
  return useServer(function (server) {
    return new ServicifyServicer(server).offer('async-identity').then(function (service) {
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
  })
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
  return useServer(function (server) {
    return new ServicifyServicer().offer('../node_modules/async-identity').catch(function (err) {
      t.ok(err);
    });
  });
});

test('servicer - exposes async-callback function through rpc', function (t) {
  return useServer(function (server) {
    return new ServicifyServicer(server).offer('async-identity').then(function (service) {
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
  return useServer(function (server) {
    return new ServicifyServicer(server).offer('promise-identity').then(function (service) {
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

test.only('servicer - can be invoked through server', function (t) {
  return useServer(function (server) {
    var serverClient = new rpc.Client({
      host: server.host,
      port: server.port,
      path: '/servicify',
      strict: true
    });

    return new ServicifyServicer(server).offer('async-identity').then(function (service) {
      return callRpc(serverClient, 'invoke', [service.id, [10]]).then(function (result) {
        t.equal(result, 10);
        return service.stop();
      });
    });
  });
});

test('servicer - invocations effect load between heartbeats', function (t) {
  return useServer(function (server) {
    var servicer = new ServicifyServicer({host: server.host, port: server.port, heartbeat: 10});
    var identity = require('async-identity');

    return servicer.offer('async-identity').then(function (service) {
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
    return new ServicifyServicer({
      host: server.host,
      port: server.port,
      heartbeat: 10
    }).offer('async-identity').then(function (service) {
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

function callRpc(client, method, params) {
  return Promise.fromNode(function (cb) {
    client.call({
      'jsonrpc': '2.0',
      'method': method,
      'params': params,
      'id': uniqid()
    }, cb);
  }).then(function (res) {
    if (res.error) {
      throw new Error(res.error.message);
    }

    return res.result;
  });
}
