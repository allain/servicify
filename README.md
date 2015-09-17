# servicify

**NOTE:** Work in progress!

Servicify is a service registry tool that allows you to trivially turn a node package into a consumable web service.

Like seaport, it supports semver, so that you can have multiple versions of a service running at the same time.

## Installation

```bash
npm install -g servicify
```

## Usage

### Start the server
```bash
servicify listen [--port 2020] [--host 127.0.0.1]
```

### Register the package with the server

```bash
servicify register PACKAGE-NAME [--port 2020] [--host 127.0.0.1]
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



