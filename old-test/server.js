var servicify = require('..');

var test = require('blue-tape');

test('listen - supports lifecycle with default options', function (t) {
  return servicify().listen().then(function(server) {
    t.equal(server.host, '127.0.0.1');
    t.equal(server.port, 2020);
    return server.stop();
  });
});

