var test = require('blue-tape');
var Promise = require('native-promise-only');
var ServicifyServicer = require('../lib/servicer');

var useServer = require('./fixtures/use-server');

test('index - supports requiring packages that export an async callback function', function (t) {
  return useServer(function (server) {
    var identity = require('async-identity');

    return new ServicifyServicer({host: server.host}).offer(identity, {
      name: 'async-identity',
      version: '1.2.3'
    }).then(function (service) {
      var servicify = require('..')();

      var fn = servicify.require('async-identity');

      t.equal(typeof fn, 'function');
      return new Promise(function(resolve, reject) {
        fn(100, function(err, result) {
          return err ? reject(err) : resolve(result);
        });
      }).then(function (result) {
        t.equal(result, 100);
        return service.stop();
      });
    });
  });
});

test('index - supports requiring packages that export an promise returning function', function (t) {
  return useServer(function(server) {
    var identity = require('promise-identity');

    return new ServicifyServicer({host: server.host}).offer(identity, {
      name: 'promise-identity',
      version: '1.2.3'
    }).then(function (service) {
      var servicify = require('..')();

      var fn = servicify.require('promise-identity');

      t.equal(typeof fn, 'function');

      return fn(100).then(function (result) {
        t.equal(result, 100);
        return service.stop();
      });
    });
  });
});

