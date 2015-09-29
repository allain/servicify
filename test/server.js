var ServicifyServer = require('../lib/server');

var test = require('blue-tape');

test('server - can be created without options', function (t) {
  var server = new ServicifyServer();
  t.ok(server instanceof ServicifyServer);
  t.end();
});

test('server - supports lifecycle without arguments', function (t) {
  return new ServicifyServer().listen().then(function (srv) {
    t.ok(srv);
    t.ok(srv.host);
    t.equal(srv.port, 2020);
    return srv.stop();
  });
});

test('server - server has expected api', function(t) {
  return new ServicifyServer().listen().then(function (srv) {
    t.ok(srv.host);
    t.equal(srv.port, 2020);
    t.equal(typeof srv.stop, 'function');
    t.equal(typeof srv.invoke, 'function');
    return srv.stop();
  });
});