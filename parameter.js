var Parameter = function (mode, value) {
  this.mode = mode;
  this.value = value;
};

Parameter.prototype.getValue = function() {
  return this.value;
};

Parameter.prototype.getMode = function() {
  return this.mode;
};
