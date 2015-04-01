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

Instruction.prototype.toString = function () {
  return this.opcode + '.' + this.modifier + ' ' + this.A.getMode() + this.A.getValue() + ', ' + this.B.getMode() + this.B.getValue();
};
