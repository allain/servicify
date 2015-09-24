var os = require('os');
var flatten = require('fj-flatten');
var values = require('object-values');
var debug = require('debug')('servicify');

module.exports = function () {
  return flatten(values(os.networkInterfaces())).filter(function (iface) {
    return iface.family === 'IPv4' && iface.internal === false;
  }).map(function (iface) {
    return iface.address;
  })[0];
};

