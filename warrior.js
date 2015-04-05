var Warrior = function(code, start, author, name) {
  this.code = code;
  this.start = start;
  this.author = author;
  this.name = name;
  this.pc = 0;
  this.color = "red";
};

Warrior.prototype.getAuthor = function() {
  return this.author;
};

Warrior.prototype.getName = function() {
  return this.name;
};

Warrior.prototype.getLength = function() {
  return this.code.length;
};

Warrior.prototype.getStart = function() {
  return this.start;
};

Warrior.prototype.getCode = function() {
  return this.code;
};

Warrior.prototype.getPC = function() {
  return this.pc;
};

Warrior.prototype.setPC = function(pc) {
  this.pc = pc;
};

Warrior.prototype.increasePC = function() {
  this.pc += 1;
}

Warrior.prototype.getColor = function() {
  return this.color;
};

Warrior.prototype.setColor = function(color) {
  this.color = color;
};