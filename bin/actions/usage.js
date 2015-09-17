var fs = require('fs');

module.exports = function(argv) {
  return fs.createReadStream(__dirname + '/usage.txt').pipe(process.stdout);
};
