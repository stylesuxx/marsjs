var Parameter = function (mode, value) {
  this.mode = mode;
  this.value = value;
};

Parameter.prototype.setValue = function(value) {
  this.value = value;
};

Parameter.prototype.getValue = function() {
  return parseInt(this.value);
};

Parameter.prototype.getMode = function() {
  return this.mode;
};

module.exports = Parameter;
