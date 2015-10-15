var test = require('blue-tape');
var Promise = require('native-promise-only');
var ServicifyServicer = require('../lib/servicer');

var useServer = require('./fixtures/use-server');
var offerService = require('./fixtures/offer-service');

test('index - supports requiring packages that export an async callback function', function (t) {
  return useServer(function (server) {
    return new ServicifyServicer({host: server.host}).offer('async-identity').then(function (service) {
      var servicify = require('..')();

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

// Skipped because I'm not sure how to slow down the zmq enough to have the request timeout
test.skip('servicer - local requires override props defined in package.json', function (t) {
  return offerService(require.resolve('delay'), function () {
    var servicify = require('..')();

    var fn = servicify.require('delay@1.0.0', {timeout: 0, type: 'promised-function'});

    return fn(100).then(function () {
      t.fail();
    }, function (err) {
      t.ok(err, 'should have timed out');
    });
  });
});


test('index - supports requiring packages that export an promise returning function', function (t) {
  return useServer(function (server) {
    return new ServicifyServicer({host: server.host}).offer('promise-identity').then(function (service) {
      var servicify = require('..')();

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

