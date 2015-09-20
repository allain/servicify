var defaults = require('defaults');

var useServicer = require('./use-servicer');

module.exports = function offerService(service, spec, fn) {
  if (!fn) {
    fn = spec;
    spec = undefined;
  }

  return useServicer({host: '127.0.0.1', port: 2020, heartbeat: 10000}, function(servicer) {
    return servicer.offer(service, spec).then(function(service) {
      return Promise.resolve(fn(service)).then(function() {
        return service.stop();
      }, function() {
        return service.stop();
      });
    });
  });
};