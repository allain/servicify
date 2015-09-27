# servicify

[![Build Status](https://travis-ci.org/allain/servicify.svg)](https://travis-ci.org/allain/servicify)
[![npm](https://img.shields.io/npm/v/servicify.svg)]()
[![npm](https://img.shields.io/npm/l/servicify.svg)]()


**NOTE:** Work in progress!

Servicify is a tool for registering and consuming npm packages as micro services.

By using semver for its resolution, you can have multiple versions of a service running at the same time, and you can
query using semver semantics.

## Installation

```bash
npm install -g servicify
```

## Usage

### Start the server
```bash
servicify listen [--port 2020] [--host 127.0.0.1]
```

### Register a package with the server

```bash
servicify offer PACKAGE-NAME [--port 2020] [--host 127.0.0.1]
```
The port and host here are used to point to the server started above.

**Note:** If the package cannot be resolved locally, it is resolved by examining the globally installed packages.

### Consume the registered service

```js
// With Servicify
var servicify = require('servicify')();
var identitySrv = servicify.require('async-identity');
identitySrv(10, function(err, result) {
  if (err) return console.error(err); 
  
  console.log(result);
});

// Without Servicify
var identity = require('async-identity');
identity(10, function(err, result) {
  if (err) return console.error(err); 
  
  console.log(result);
});
```



