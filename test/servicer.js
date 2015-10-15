var test = require('blue-tape');
var Promise = require('native-promise-only');
var useServer = require('./fixtures/use-server');

var ServicifyServicer = require('../lib/servicer');

test('servicer - can be created without a server to connect to yet', function (t) {
  var ps = new ServicifyServicer();
  t.ok(ps instanceof ServicifyServicer, 'constructor returns a ServicifyServer');
  t.end();
});


test('servicer - returned service has expected API', function (t) {
  return useServer(function (server) {
    return new ServicifyServicer(server).offer('async-identity').then(function (service) {
      t.deepEqual(service.server, {host: server.host, port: server.port}, 'has server location');
      return service.stop();
    });
  });
});

test('servicer - supports registering a function that returns promises', function (t) {
  return useServer(function (server) {
    var identity = function (x) { return Promise.resolve(x); };

    return new ServicifyServicer(server).offer(identity, {name: 'identity', version: '1.0.0'}).then(function (service) {
      t.equal(typeof service.invoke, 'function', 'has invoke function');
      return service.invoke(10).then(function (result) {
        t.equal(result, 10, 'passes through result');
        return service.stop();
      });
    });
  });
});

test('servicer - supports specifying properties in a package\'s package.json', function (t) {
  return useServer(function (server) {
    return new ServicifyServicer(server).offer(require.resolve('blahblah')).then(function (service) {
      t.ok(service, 'service is constructed');
      t.equal(service.timeout, 10, 'able to spec number prop');
      t.equal(service.param, 'test param', 'able to spec string param');
      return service.stop();
    });
  });
});


test('servicer - supports registering a package by name', function (t) {
  return useServer(function (server) {
    return new ServicifyServicer(server).offer('async-identity').then(function (service) {
      var value = Math.random();
      return service.invoke(value).then(function (result) {
        t.equal(result, value, 'passes returns value');
        return service.stop();
      });
    });
  });
});

test('servicer - supports registering a package using an absolute path to its entry point', function (t) {
  return useServer(function (server) {
    return new ServicifyServicer(server).offer(require.resolve('blahblah')).then(function (service) {
      var value = Math.random();
      return service.invoke(value).then(function (result) {
        t.equal(result, value, 'returns expected value');
        return service.stop();
      });
    });
  });
});


test('servicer - supports registering a package by its absolute directory', function (t) {
  return useServer(function (server) {
    return new ServicifyServicer(server).offer(__dirname + '/../node_modules/async-identity').then(function (service) {
      var value = Math.random();
      return service.invoke(value).then(function (result) {
        t.equal(result, value, 'returns passed value');
        return service.stop();
      });
    });
  });
});

test('servicer - supports registering a package by directory even when main isn\'t index.js', function (t) {
  return useServer(function (server) {
    return new ServicifyServicer(server).offer(__dirname + '/node_modules/blahblah').then(function (service) {
      var value = Math.random();
      return service.invoke(value).then(function (result) {
        t.equal(result, value, 'returns passed value');
        return service.stop();
      });
    });
  });
});


test('servicer - supports registering a package by its relative path', function (t) {
  return useServer(function () {
    return new ServicifyServicer().offer('../node_modules/async-identity').then(function (service) {
      t.equal(typeof service, 'object', 'expects offer request to return an object that can be used to stop it');
      t.equal(service.type, 'callback-function', 'has correct service type');
      return service.stop();
    });
  });
});

test('servicer - throws when offered is not a package name and no spec is given', function (t) {
  return new ServicifyServicer().offer(function () {
  }).catch(function (err) {
    t.ok(err instanceof Error, 'expects an Error');
    t.equal(err.message, 'spec not given with offer', 'correct message');
  });
});
