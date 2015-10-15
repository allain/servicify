var Servicify = require('..');
var test = require('blue-tape');
var Promise = require('native-promise-only');

//var offerService = require('./fixtures/offer-service');

function useServer(servicify, fn) {
  return servicify.listen().then(function(server) {
    return fn(server).then(function() {
      return server.stop();
    })
  });
}

test('listen - supports lifecycle with default options', function (t) {
  return new Servicify().listen().then(function(server) {
    t.equal(server.host, '127.0.0.1');
    t.equal(server.port, 2020);
    return server.stop();
  });
});

test('index - supports requiring packages that export an async callback function', function (t) {
  var servicify =  new Servicify();
  return useServer(servicify, function(server) {
    return servicify.offer('async-identity').then(function(service) {
      var fn = servicify.require('async-identity');

      t.equal(typeof fn, 'function', 'require returns a function');

      var value = Math.random();

      return new Promise(function (resolve, reject) {
        fn(value, function (err, result) {
          return err ? reject(err) : resolve(result);
        });
      }).then(function (result) {
        t.equal(result, value, 'returns correct result');
        return service.stop();
      });
    });
  });
});

test('index - supports requiring packages that export an promise returning function', function (t) {
  var servicify =  new Servicify();
  return useServer(servicify, function(server) {
    return servicify.offer('promise-identity').then(function (service) {
      var fn = servicify.require('promise-identity@^1.x.x');

      t.equal(typeof fn, 'function', 'exposes function');

      var value = Math.random();

      return fn(value).then(function (result) {
        t.equal(result, value, 'returns correct result');
        return service.stop();
      });
    });
  });
});
