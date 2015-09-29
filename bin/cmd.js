#!/usr/bin/env node

var argv = require('minimist')(process.argv.slice(2));

if (argv.version) {
  return console.log(require('../package.json').version);
}

var actions = {
  listen: require('./actions/listen'),
  offer: require('./actions/offer'),
  usage: require('./actions/usage')
};

var actionName = argv._[0];
var action = actions[actionName];
if (!action || argv.h || argv.help) {
  action = actions['usage'];
}

action(argv);
