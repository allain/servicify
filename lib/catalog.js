var Promise = require('bluebird');

var semver = require('semver');
var ducktype = require('ducktype');
var uniqid = require('uniqid');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var defined = require('defined');
var clone = require('clone');


var specSchema = ducktype({
  name: String,
  version: String,
  host: String,
  port: Number,
  expires: Number
});

function ServicifyCatalog(opts) {
  if (!(this instanceof ServicifyCatalog)) return new ServicifyCatalog(opts);
  this._opts = opts = opts || {};

  this._offerings = [];

  EventEmitter.call(this);

  process.nextTick(function() {
    this.emit('ready');
  }.bind(this));
}

util.inherits(ServicifyCatalog, EventEmitter);

ServicifyCatalog.prototype.gc = function() {
  var now = Date.now();
  return this.rescind(function(r) {
    return r.expires < now;
  });
};

ServicifyCatalog.prototype.offer = function (offeringSpec) {
  if (!specSchema.test(offeringSpec))
    return Promise.reject(new Error('invalid service spec: ' + JSON.stringify(offeringSpec)));

  var existing = this._offerings.filter(matchBySpec(offeringSpec));
  if (existing.length) {
    offering = existing[0];
    Object.keys(offeringSpec).forEach(function(prop) {
      offering[prop] = offeringSpec[prop];
    })
  } else {
    // clone spec so we don't clobber it
    var offering = clone(offeringSpec);
    offering.id = offering.id || uniqid();
    this._offerings.push(offering);
  }

  this.emit('offered', offering);

  return Promise.resolve(offering);
};

ServicifyCatalog.prototype.rescind = function () {
  var self = this;

  var matcher = buildMatcher(arguments[0], arguments[1]);

  var rescinded = [];

  this._offerings = this._offerings.filter(function(r) {
    if (matcher(r)) {
      rescinded.push(r);
      return false;
    }

    return true;
  });

  rescinded.forEach(function(d) {
    self.emit('rescinded', d);
  });

  return Promise.resolve(rescinded);
};

ServicifyCatalog.prototype.get = function (id) {
  var offerings =  this._offerings.filter(function(offering) { return offering.id === id; });

  return Promise.resolve(offerings[0]);
};

ServicifyCatalog.prototype.resolve = function (name, required) {
  var offerings =  this._offerings.filter(matchBySemver(name, required));

  if (offerings.length) {
    this.emit('resolved', name, required, offerings);
  } else {
    this.emit('unresolved', name, required);
  }

  return Promise.resolve(offerings);
};

function buildMatcher() {
  var args = [].slice.call(arguments);

  if (args[0] && args[1]) {
    return matchBySemver(args[0], args[1]);
  }

  if (typeof args[0] === 'function') {
    return args[0];
  }

  if (Array.isArray(args[0])) {
    return matchByInclusion(args[0]);
  }

  if (typeof args[0] === 'object') {
   return matchBySpec(args[0]);
  }

  return matchById(args[0]);
}

function matchBySemver(name, required) {
  return function(r) {
    return r.name === name && semver.satisfies(r.version, required);
  };
}

function matchBySpec(spec) {
  return function (r) {
    return r.id === spec.id || (r.name === spec.name && r.version === spec.version && r.host === spec.host && r.port === spec.port);
  };
}

function matchByInclusion(array) {
  return function(r) {
    return array.indexOf(r) !== -1;
  };
}

function matchById(id) {
  return function (r) {
    return r.id === id;
  };
}

module.exports = ServicifyCatalog;