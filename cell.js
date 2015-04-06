var Cell = function(instruction) {
  this.instruction = instruction;

  // Last action may be: init | read | write
  this.lastAction = 'init';
  this.lastUser = null;
};

Cell.prototype.setInstruction = function(instruction) {
  this.instruction = instruction;
};

Cell.prototype.getInstruction = function() {
  return this.instruction;
};

Cell.prototype.setLastAction = function(action) {
  this.lastAction = action;
};

Cell.prototype.getLastAction = function() {
  return this.lastAction;
};

Cell.prototype.setLastUser = function(warrior) {
  this.lastUser = warrior;
};

Cell.prototype.getLastUser = function() {
  return this.lastUser;
};
