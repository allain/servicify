var ServicifyServer = require('../../lib/server');

module.exports = function(argv) {
  new ServicifyServer().listen({
    host: argv.host || '0.0.0.0',
    port: argv.port || argv._[1] || 2020
  }).then(function(server) {
    console.log('servicify server listening at', server.host + ':' + server.port);
  });
};