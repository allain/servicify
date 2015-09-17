var ServicifyService = require('servicify-service');
var npm = require('npm');
var temp = require('temp');

module.exports = function (argv) {
  var service = new ServicifyService({
    host: argv.host || '127.0.0.1',
    port: argv.port || 2020
  });

  var targetName = argv._[1];

  service.register(argv._[1]).then(function (r) {
    console.log('registered local', r.name + '@' + r.version, ' with ', r.server.host + ':' + r.server.host);
  }, function (err) {
    if (err.code !== 'MODULE_NOT_FOUND') throw err;

    return new Promise(function (resolve, reject) {
      npm.load({}, function (err) {
        if (err) return reject(err);

        process.chdir(npm.config.get('prefix'));

        service.register(argv._[1]).then(function (r) {
          console.log('registered global', r.name + '@' + r.version, ' with ', r.server.host + ':' + r.server.host);
        }, reject);
      });
    });
  }).catch(function (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.error('could not resolve package:', argv._[1]);
    } else {
      console.error(err.message);
      console.error(err);
    }
  });


};