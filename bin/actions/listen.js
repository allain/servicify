var servicify = require('../../');

module.exports = function(argv) {
  servicify({
    host: argv.host || '0.0.0.0',
    port: argv.port || argv._[1] || 2020
  }).listen().then(function(server) {
    console.log('servicify server listening at', server.host + ':' + server.port);
  });
};