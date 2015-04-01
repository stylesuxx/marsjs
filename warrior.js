var Warrior = function(code, start) {
  this.code = code;
  this.start = start;
  this.author = 'unknown';
  this.name = 'unknown';
};

Warrior.prototype.setAuthor = function(author) {
  this.author = author;
};

Warrior.prototype.setName = function(name) {
  this.name = name;
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
