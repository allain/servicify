var debug = require('debug')('servicify-utils');

module.exports.start = function(startable) {
  debug('Starting %s', startable.conf.name);
  return asyncDo(startable, 'start').then(function() {
    debug('Started %s', startable.conf.name);
    return startable;
  });
};

module.exports.stop = function(stoppable) {
  debug('Stopping %s', stoppable.conf.name);
  return asyncDo(stoppable, 'stop').then(function() {
    debug('Stopped %s', stoppable.conf.name);
    return stoppable;
  });
};

function asyncDo(target, method) {
  return new Promise(function (resolve) {
    target.once(method, resolve);
    target[method]();
  });
}