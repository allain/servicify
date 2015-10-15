var defaults = require('defaults');

var useServer = require('./use-server');

var ServicifyServicer = require('../../lib/servicer');

module.exports = function useServicer(servicerOpts, fn) {
  if (!fn) {
    fn = servicerOpts;
    servicerOpts = {};
  }

  servicerOpts = defaults(servicerOpts, {host: '127.0.0.1', port: 2020, heartbeat: 10000});

  return useServer(servicerOpts, function() {
    return fn(new ServicifyServicer(servicerOpts));
  });
};