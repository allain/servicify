var test = require('blue-tape');
var Promise = require('native-promise-only');

var offerService = require('./fixtures/offer-service');
var debug = require('debug')('test-client');

var ServicifyClient = require('../lib/client');

test('client - can be created without a server to connect to yet', function (t) {
  var client = new ServicifyClient();
  t.ok(client instanceof ServicifyClient);
  client.stop();
  t.end();
});

test('client - supports resolving to a function that returns promises', function (t) {
  return offerService(require('promise-identity'), {
    name: 'promise-identity',
    version: '1.1.1'
  }, function () {
    var client = ServicifyClient();
    return client.resolve('promise-identity@^1.1.1', [10]).then(function (fn) {
      t.equal(typeof fn, 'function');
      return fn(10).then(function (val) {
        t.equal(val, 10);
        return client.stop();
      });
    });
  });
});

test('client - supports resolving to a function that using callback signature', function (t) {
  return offerService(require('async-identity'), {
    name: 'async-identity',
    version: '1.1.1'
  }, function () {
    var client = new ServicifyClient();
    return client.resolve('async-identity@^1.0.0').then(function (fn) {
      t.equal(typeof fn, 'function');
      return new Promise(function(resolve) {
        fn(10, function (err, val) {
          t.error(err);
          t.equal(val, 10);
          resolve(val);
        });
      }).then(function(val) {
        debug(val);
        debug('stopping');
        return client.stop();
      });
    });
  });
});