var Servicify = require('..');
var test = require('blue-tape');
var Promise = require('native-promise-only');

function promiseIdentity(x) {
  return Promise.resolve(x);
}

function callbackIdentity(x, cb) {
  setImmediate(function() {
    cb(null, x);
  });
}

function withNewServer(fn) {
  var  servicify = new Servicify();

  return servicify.listen().then(function(server) {
    return Promise.resolve(fn(server, servicify)).then(function() {
      return server.stop();
    });
  });
}

test('test the testers', function(t) {
  return withNewServer(function(server, servicify) {
    t.equal(typeof server, 'object', 'server is an object');
    t.ok(servicify instanceof Servicify, 'servicify is a Servicify Instance');
  });
});

test('supports lifecycle with default options', function (t) {
  return new Servicify().listen().then(function(server) {
    t.equal(server.host, '127.0.0.1');
    t.equal(server.port, 2020);
    return server.stop();
  });
});

test('promised-function offerings can invoke their targets directly', function (t) {
  return withNewServer(function(server, servicify) {
    return servicify.offer(promiseIdentity, 'a@1.2.3').then(function(offering) {
      var value = Math.random();

      return offering.invoke(value).then(function(result) {
        t.equal(result, value, 'returned value passed in');
        offering.stop();
      })
    });
  });
});

test('callback-function offerings can invoke their targets directly', function (t) {
  return withNewServer(function(server, servicify) {
    return servicify.offer(callbackIdentity, 'b@1.2.3').then(function(offering) {
      return new Promise(function(resolve) {
        var value = Math.random();
        return offering.invoke(value, function(err, result) {
          t.equal(result, value, 'returned value passed in');
          offering.stop().then(resolve);
        });
      });
    });
  });
});

test('supports offering local packages', function (t) {
  return withNewServer(function(server, servicify) {
    return servicify.offer('promise-identity').then(function (offering) {
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
