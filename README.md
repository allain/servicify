#servicify

**NOTE:** Work in progress!

Servicify is a service registry tool that allows you to trivially turn a node package into a consumable web service.

Like seaport, it supports semver.

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
**Note:** at present you run this from a package that has the package installed already

```bash
servicify register PACKAGE-NAME [--port 2020] [--host 127.0.0.1]
```
The port and host here are used to point to the server started above.

### Consume the registered service

```js
// With Servicify
var servicify = require('servicify');
var identitySrv = servicify('async-identity');
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



