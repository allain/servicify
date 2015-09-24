var targetTypes = [
  require('./callback-function'),
  require('./promised-function')
];

module.exports = function (target) {
  for (var i = 0; i < targetTypes.length; i++) {
    if (targetTypes[i].applies(target))
      return targetTypes[i];
  }
};