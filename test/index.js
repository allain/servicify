var test = require('blue-tape');
var Promise = require('bluebird');
var ServicifyService = require('../lib/service');
var ServicifyServer = require('../lib/server');

test('cli - supports requiring packages that export an async callback function', function (t) {
  return new ServicifyServer().listen({host: '127.0.0.1'}).then(function (server) {
    var identity = require('async-identity');

    return new ServicifyService({host: server.host}).offer(identity, {name: 'async-identity', version: '1.2.3'}).then(function (service) {
      var servicify = require('..')();

      var fn = servicify.require('async-identity');

      t.equal(typeof fn, 'function');
      return Promise.fromNode(function (cb) {
        fn(100, cb);
      }).then(function (result) {
        t.equal(result, 100);
        return service.stop();
      });
    }).then(function() {
      return server.stop();
    });
  });
});

test('cli - supports requiring packages that export an promise returning function', function (t) {
  return new ServicifyServer().listen({host: '127.0.0.1'}).then(function (server) {
    var identity = require('promise-identity');

    return new ServicifyService({host: server.host}).offer(identity, {name: 'promise-identity', version: '1.2.3'}).then(function (service) {
      var servicify = require('..')();

      var fn = servicify.require('promise-identity');

      t.equal(typeof fn, 'function');

      return fn(100).then(function (result) {
        t.equal(result, 100);
        return service.stop();
      });
    }).then(function() {
      return server.stop();
    });
  });
});