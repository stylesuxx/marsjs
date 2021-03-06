var Instruction = function (opcode, modifier, A, B) {
  this.opcode = opcode;
  this.modifier = modifier;
  this.A = A;
  this.B = B;
};

Instruction.prototype.getOpcode = function () {
  return this.opcode;
};

Instruction.prototype.getModifier = function () {
  return this.modifier;
};

Instruction.prototype.getA = function () {
  return this.A;
};

Instruction.prototype.getB = function () {
  return this.B;
};

Instruction.prototype.clone = function() {
  var a = this.A.clone();
  var b = this.B.clone();
  var clone = new Instruction(this.opcode, this.modifier, a, b);

  return clone;
};

Instruction.prototype.toString = function () {
  var string = this.opcode + '.' + this.modifier + ' ' + this.A.getMode() + this.A.getValue() + ', ' + this.B.getMode() + this.B.getValue();
  return string.toUpperCase();
};

module.exports = Instruction;
