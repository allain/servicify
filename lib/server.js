var defaults = require('defaults');
var Broker = require('pigato').Broker;
var ip = require('./ip');

var start = require('./utils').start;
var stop = require('./utils').stop;


var debug = require('debug')('servicify-server');

function ServicifyServer(opts) {
  if (!(this instanceof ServicifyServer)) return new ServicifyServer(opts);
}

ServicifyServer.prototype.listen = function (opts) {
  opts = defaults(opts, {
    port: 2020,
    host: ip() || '0.0.0.0'
  });

  var brokerAddress = 'tcp://' + opts.host + ':' + opts.port;

  return start(new Broker(brokerAddress)).then(function (broker) {
    broker.on('error', function (err) {
      debug('ERROR %j', err);
    });

    return {
      host: opts.host,
      port: opts.port,
      stop: function () {
        return stop(broker);
      }
    };
  });
};

module.exports = ServicifyServer;
