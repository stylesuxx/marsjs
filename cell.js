var Cell = function(instruction) {
  this.instruction = instruction;

  // Last action may be: init | read | write
  this.lastAction = 'init';
  this.lastUser = null;
}

Cell.prototype.getInstruction = function() {
  return this.instruction;
}

Cell.prototype.setInstruction = function(instruction) {
  this.instruction = instruction;
};

Cell.prototype.getLastAction = function() {
  return this.lastAction;
}

Cell.prototype.setLastAction = function(action) {
  this.lastAction = action;
}

Cell.prototype.getLastUser = function() {
  return this.lastUser;
}

Cell.prototype.setLastUser = function(warrior) {
  this.lastUser = warrior;
}
