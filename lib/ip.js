var os = require('os');
var flatten = require('fj-flatten');
var values = require('object-values');

module.exports = function () {
  var ip = flatten(values(os.networkInterfaces())).filter(function (iface) {
    return iface.family === 'IPv4' && iface.internal === false;
  }).map(function (iface) {
    return iface.address;
  })[0];

  if (!ip) throw new Error('unable to determin IP address');

  return ip;
};

