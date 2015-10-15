var debug = require('debug')('servicify-utils');

module.exports.start = function(startable) {
  var name = extractName(startable);
  debug('Starting %s', name);
  return asyncDo(startable, 'start').then(function() {
    debug('Started %s', name);
    return startable;
  });
};

module.exports.stop = function(stoppable) {
  var name = extractName(stoppable);
  debug('Stopping %s', name);
  return asyncDo(stoppable, 'stop').then(function() {
    debug('Stopped %s', name);
    return stoppable;
  });
};

function asyncDo(target, method) {
  return new Promise(function (resolve) {
    target.once(method, resolve);
    target[method]();
  });
}

function extractName(obj) {
  return obj.conf.name || obj.conf.prefix;
}