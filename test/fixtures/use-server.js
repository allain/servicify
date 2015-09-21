var defaults = require('defaults');

var ServicifyServer = require('../../lib/server');

module.exports = function useServer(serverOpts, fn) {
  if (!fn) {
    fn = serverOpts;
    serverOpts = {};
  }

  serverOpts = defaults(serverOpts || {}, {host: '127.0.0.1'});

  return new ServicifyServer().listen(serverOpts).then(function (server) {
    return Promise.resolve(fn(server)).then(function () {
      return server.stop();
    });
  });
};