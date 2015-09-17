var test = require('blue-tape');
var Promise = require('bluebird');
var ServicifyService = require('servicify-service');
var ServicifyServer = require('servicify-server');

test('supports simple require replacement', function (t) {
  return withServer().then(function (server) {
    var identity = require('async-identity');

    return new ServicifyService().offer(identity, {name: 'async-identity', version: '1.2.3'}).then(function (service) {
      var servicify = require('..')();

      var fn = servicify.require('async-identity');

      t.equal(typeof fn, 'function');
      return Promise.fromNode(function (cb) {
        fn(100, cb);
      }).then(function (result) {
        t.equal(result, 100);

        return service.stop();
      });
    }).then(function () {
      return server.stop();
    });
  });
});

function withServer() {
  var server = new ServicifyServer();
  return server.listen();
}
