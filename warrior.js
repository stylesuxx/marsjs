var Warrior = function(code, start, author, name) {
  this.code = code;
  this.start = start;
  this.queue = [];

  this.author = author;
  this.name = name;
  this.color = "red";
};

/**
 * Add a new address to the end of the PC queue
 */
Warrior.prototype.pushPC = function(address) {
  this.queue.push(address);
}

/**
 * Return the first address of the PC queue
 */
Warrior.prototype.shiftPC = function() {
  var address = this.queue.shift();
  if(address != undefined) {
    return address;
  }
  else {
    throw ("Requested address from a dead warrior");
  }
}

/**
 * Return true as long as the warrior has an address on the PC queue
 */
Warrior.prototype.isAlive = function() {
  return (this.queue.length > 0);
}

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

Warrior.prototype.setColor = function(color) {
  this.color = color;
};

Warrior.prototype.getColor = function() {
  return this.color;
};
