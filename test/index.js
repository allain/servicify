var test = require('blue-tape');
var Promise = require('bluebird');
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
      return Promise.fromNode(function (cb) {
        fn(100, cb);
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

test('index - supports offering endpoints that are not actual packages', function () {
  return useServer(function (server) {
    var dbl = function (x) {
      return x * 2;
    };

    // random package name
    var name = 'dbl' + Math.round(Math.random() * 10000);
    var dblSpec = {name: name, version: '1.3.5'};

    return new ServicifyServicer({host: server.host}).offer(dbl, dblSpec).then(function (service) {
      return service.stop();
    });
  });
});

test('index - supports requiring endpoints that are not actual packages', function () {
  return useServer(function (server) {
    var dbl = function (x) {
      return x * 2;
    };

    // random package name
    var name = 'dbl' + Math.round(Math.random() * 10000);
    var dblSpec = {name: name, version: '1.3.5'};

    return new ServicifyServicer({host: server.host}).offer(dbl, dblSpec).then(function (service) {
      return service.stop();
    });
  });
});

