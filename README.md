# servicify

[![Build Status](https://travis-ci.org/allain/servicify.svg)](https://travis-ci.org/allain/servicify)
[![npm](https://img.shields.io/npm/v/servicify.svg)]()
[![npm](https://img.shields.io/npm/l/servicify.svg)]()

## Introduction

**NOTE: API is still in flux until I hit v1.0.0** 

Servicify is a tool for trivially registering and consuming npm packages as microservices.

I'm intending it to support multiple-backends since each backend comes with trade-offs.

Service requests are done using semver which supports having multiple versions of a service in deployment at the same time.

## Installation

```bash
npm install servicify
```

## API

Servicify's API is deliberately small. It's a tool, not a lifestyle.

### Servicify([opts])

It's API has three things Servicify.listen, Servicify.offer, Servicify.require

### Servicify.listen([opts]) : Promise

Starts a servicify registry making it possible for services to be found and for clients to consume them.
 
It returns a promise that resolves to an object with a .stop() method for turning the server off.


### Servicify.offer(offering[, offeringSpec]) : Promise

The offer method makes its offering available to consumers.

Offerings can be:

1. an asynchronous function (callback, or promised) and a spec of the form {name: 'NAME', version: 'SEMVER'}
2. a package name that exports one of #1

offer returns a promise which resolves to an object with a stop and an invoke method.

### Servicify.require(requirement[, type])



![Servicify All The Things!](http://cdn.meme.am/instances/500x/40263771.jpg)
