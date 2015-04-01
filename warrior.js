var Warrior = function(code, start, author, name) {
  this.code = code;
  this.start = start;
  this.author = author;
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
