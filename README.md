# servicify

[![Build Status](https://travis-ci.org/allain/servicify.svg)](https://travis-ci.org/allain/servicify)
[![npm](https://img.shields.io/npm/v/servicify.svg)]()
[![npm](https://img.shields.io/npm/l/servicify.svg)]()

## Introduction

**NOTE: API is still in flux until I hit v1.0.0** 

Servicify is a tool for trivially registering and consuming npm packages as microservices.

It's a wrapper around Paolo Ardoino's fantastic [pigato](https://github.com/prdn/pigato) library, so it uses 
ZeroMQ under the hood.

I've extended it to use semver in its resolution algorithm and have my fingers crossed that it'll get merged in.
If not, it's not a huge deal; I suspect I can monkey patch it, but of course I'd rather not.

By using semver for its resolution, you can have multiple versions of a service running at the same time, and you can
query using semver semantics.

## Installation

```bash
npm install -g servicify
```
## Usage

### Start the server
```bash
servicify listen [--port 2020] [--host 0.0.0.0]
```

### Start offering a package as a service

```bash
servicify offer PACKAGE-NAME [--port 2020] [--host 127.0.0.1]
```
The port and host here are used to point to the server started above.

**Note:** If the package cannot be resolved locally, it is resolved by examining the globally installed packages.

### Consume the services

```js
// With Servicify
var servicify = require('servicify')({host: '127.0.0.1', port: 2020});
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
![Servicify All The Things!](http://cdn.meme.am/instances/500x/40263771.jpg)
