# servicify

[![Build Status](https://travis-ci.org/allain/servicify.svg)](https://travis-ci.org/allain/servicify)
[![npm](https://img.shields.io/npm/v/servicify.svg)]()
[![npm](https://img.shields.io/npm/l/servicify.svg)]()

## Introduction

Servicify is a tool for trivially registering and consuming npm packages as microservices.

It's designed to be transport agnostic. Each transport comes with it's own trade-offs, and I shouldn't be deciding which ones are important to you.

Services are versioned unsing semver (X.X.X) which supports having multiple versions of a service to be deployed at the same time.

## Installation

```bash
npm install servicify
```

## API

Servicify's API is deliberately small. It's a tool, not a lifestyle.

### Servicify({driver: name|function, ...})

Returns an instance of a Servicify object that uses the specified driver to as its backend.

If driver is a string then it'll look for a module called 'servicify-NAME', otherwise it uses the function provided as a backend factory.

All other opts are passed into the driver factory untouched.

If no options are given, then it will look for them in a package.json property called "servicify". 

### Servicify.listen([opts]) : Promise

Starts a servicify registry making it possible for services to be found by clients wishing to consume them.
 
It returns a promise that resolves to an object when the listener is ready. The resolved object always has a `stop()` method which stops the listener. Depending on which driver you are using it'll have additional properties too. For example, the servicify-http will have `host` and `port`.

### Servicify.offer(offering[, offeringSpec]) : Promise

The offer method makes its offering available to consumers.

Offerings can be:

1. an asynchronous function (callback, or promised) and a spec of the form {name: 'NAME', version: 'SEMVER'}
2. a package name that exports one of #1

`offer` returns a promise which resolves to an object with stop and an invoke methods, as well as any driver specific properties it may have.

### Servicify.require(requirement[, type])

Requests a offering from the servicify registry. Returns the same effective api as using the offering directly.

To fully qualify the requirement you may give all its detail like below. It has the advantage of not requiring consumers to have the package installed.

```js
var r = servicify.require('a@^1.0.0', 'promised-function');
```

Or if you prefer to keep things simple, install the package on the client, and then you can use:

```js
// Required version, and type are inferred by examining package.json
var r = servicify.require('a');
```

#### require shorthand

If you've setup servicify using the "servicify" package.json option, you may use this shorthand:

```js
var a = require('servicify')('a'); // instead
```

![Servicify All The Things!](https://docs.google.com/uc?id=0B66puqNhVuXQWUVQX3NkQU1EdWs&export=download)
