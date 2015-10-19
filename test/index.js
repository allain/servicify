var Servicify = require('../lib/servicify');
var test = require('blue-tape');
var Promise = require('native-promise-only');

function promiseIdentity(x) {
  return Promise.resolve(x);
}

function callbackIdentity(x, cb) {
  setImmediate(function () {
    cb(null, x);
  });
}

function withNewServer(fn) {
  var servicify = new Servicify();

  return servicify.listen().then(function (server) {
    return Promise.resolve(fn(server, servicify)).then(server.stop);
  });
}

test('test the testers', function (t) {
  return withNewServer(function (server, servicify) {
    t.equal(typeof server, 'object', 'server is an object');

    // Only care about duck typing
    t.equal(typeof servicify.require, 'function', 'has require method');
    t.equal(typeof servicify.offer, 'function', 'has offer method');
    t.equal(typeof servicify.listen, 'function', 'has listen method');
  });
});

test('supports lifecycle with default options', function (t) {
  return Servicify().listen().then(function (server) {
    t.equal(server.host, '127.0.0.1');
    t.equal(server.port, 2020);
    return server.stop();
  });
});

test('promised-function offerings can invoke their targets directly', function (t) {
  return withNewServer(function (server, servicify) {
    return servicify.offer(promiseIdentity, 'a@1.2.3').then(function (offering) {
      var value = Math.random();

      return offering.invoke(value).then(function (result) {
        t.equal(result, value, 'returned value passed in');
        offering.stop();
      });
    });
  });
});

test('callback-function offerings can invoke their targets directly', function (t) {
  return withNewServer(function (server, servicify) {
    return servicify.offer(callbackIdentity, 'b@1.2.3').then(function (offering) {
      return new Promise(function (resolve, reject) {
        var value = Math.random();
        return offering.invoke(value, function (err, result) {
          if (err) reject(err);
          t.equal(result, value, 'returned value passed in');

          resolve(offering.stop());
        });
      });
    });
  });
});

test('supports offering local packages', function (t) {
  return withNewServer(function (server, servicify) {
    return servicify.offer('promise-identity').then(function (offering) {
      var value = Math.random();

      return offering.invoke(value).then(function (result) {
        t.equal(result, value, 'returned value passed in');
        offering.stop();
      });
    });
  });
});

test('offerings are available for require', function (t) {
  return withNewServer(function (server, servicify) {
    return servicify.offer('promise-identity').then(function (offering) {
      var value = Math.random();

      var fn = servicify.require('promise-identity');

      t.equal(typeof fn, 'function', 'should return a function');

      return fn(value).then(function (result) {
        t.equal(result, value, 'returned value passed in');
        return offering.stop();
      });
    });
  });
});

test('can require without server being up yet', function (t) {
  var identity = Servicify().require('promise-identity');
  t.equal(typeof identity, 'function');
  t.end();
});

test('can offer without server being up yet', function (t) {
  return Servicify().offer('promise-identity').then(function (offering) {
    t.equal(typeof offering, 'object');
    return offering.stop();
  });
});

test('loads options from package.json when requiring package', function (t) {
  return withNewServer(function (server, servicify) {
    servicify.offer(require.resolve('blahblah')).then(function (offering) {
      t.ok(offering, 'service is constructed');
      t.equal(offering.timeout, 10, 'able to spec number prop');
      t.equal(offering.param, 'test param', 'able to spec string param');

      return offering.stop();
    });
  });
});

test('throws when offered is not a package name and no spec is given', function (t) {
  withNewServer(function (server, servicify) {
    return servicify.offer(function() {}).then(t.fail, function(err) {
      t.ok(err instanceof Error, 'expects an Error');
      t.equal(err.message, 'spec not given with offer', 'correct message');
      t.end();
    });
  });
});


