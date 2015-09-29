var test = require('blue-tape');
var Promise = require('native-promise-only');
var useServer = require('./fixtures/use-server');
var debug = require('debug')('servicify-servicer-test');

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
      return service.invoke(10).then(function (result) {
        t.equal(result, 10);
        return service.stop();
      });
    });
  });
});

test('servicer - supports registering a package by its absolute directory', function (t) {
  return useServer(function (server) {
    return new ServicifyServicer(server).offer(__dirname + '/../node_modules/async-identity').then(function (service) {
      return service.invoke(10).then(function (result) {
        t.equal(result, 10);
        return service.stop();
      });
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

test('servicer - can be invoked through server', function (t) {
  return useServer(function (server) {
    var identity = require('async-identity');

    return new ServicifyServicer(server).offer(identity, {name: 'async-identity', version: '1.0.0'}).then(function (service) {
      return server.invoke('async-identity@1.0.0', [10]).then(function(result) {
        t.equal(result, 10);
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

test('servicer - when error occurs while servicing, error bubbles up', function(t) {
  return useServer(function(server) {
    return new ServicifyServicer(server).offer(function() {
      debug('FORCE FAILURE');
      return Promise.reject(new Error('error'));
    }, {name: 'a', version: '1.0.0'}).then(function(service) {
      return server.invoke('a@1.0.0', [10]).catch(function(err) {
        t.ok(err instanceof Error);
        t.equal(err.message, 'error');
        return service.stop();
      });
    });
  });
});