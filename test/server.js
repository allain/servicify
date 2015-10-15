var ServicifyServer = require('../lib/server');

var test = require('blue-tape');

test('server - can be created without options', function (t) {
  var server = new ServicifyServer();
  t.ok(server instanceof ServicifyServer, 'returns SericifyServer instance from constructor');
  t.end();
});

test('server - supports lifecycle without arguments', function (t) {
  return new ServicifyServer().listen().then(function (srv) {
    t.equal(typeof srv, 'object', 'returns a service object that can be used to stop it');
    t.ok(srv.host, 'exposes host');
    t.equal(srv.port, 2020, 'defaults to port');
    return srv.stop();
  });
});

test('server - server has expected api', function(t) {
  return new ServicifyServer().listen().then(function (srv) {
    t.ok(srv.host, 'exposes host');
    t.equal(srv.port, 2020, 'defaults to port 2020');
    t.equal(typeof srv.stop, 'function', 'has a stop method');
    return srv.stop();
  });
});
