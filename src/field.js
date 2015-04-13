var Cell = require('./cell');
var Parameter = require('./parameter');
var Instruction = require('./instruction');

/**
 * The playing field consists of a memory aray that is linked from the last to
 * the first element and the size of coreSize.
 */
var Field = function(coreSize, maxCycles) {
  this.coreSize = coreSize;
  this.maxCycles = maxCycles;
  this.currentCycle = 0;

  this.op = {};
  this.op.add = require('./opcodes/add');
  this.op.cmp = require('./opcodes/cmp');
  this.op.div = require('./opcodes/div');
  this.op.djn = require('./opcodes/djn');
  this.op.jmn = require('./opcodes/jmn');
  this.op.jmp = require('./opcodes/jmp');
  this.op.jmz = require('./opcodes/jmz');
  this.op.mod = require('./opcodes/mod');
  this.op.mov = require('./opcodes/mov');
  this.op.mul = require('./opcodes/mul');
  this.op.slt = require('./opcodes/slt');
  this.op.spl = require('./opcodes/spl');
  this.op.sub = require('./opcodes/sub');

  this.field = [];
  this.warriors = [];
  this.currentWarrior = 0;
  this.currentWarriorIndex = 0;
  this.warriorsLeft = 0;

  this.availablePositions = [
    {
      start: 0,
      end: this.coreSize - 1
    }
  ];

  this.touched = [];
  this.updateCallback = null;
  this.winCallback = null;
  this.maxCyclesCallback = null;
  this.suicideCallback = null;
  this.warriorDiedCallback = null;

  // Trampoline to keep the stack flat
  this.trampoline = function(fn) {
    while(fn && typeof fn === 'function') {
      fn = fn();
    }
  };

  // Initialize the field with "dat.f $0, $0"
  this.initializField = function() {
    for(var i = 0; i < this.coreSize; i++) {
      var p1 = new Parameter('$', 0);
      var p2 = new Parameter('$', 0);
      var instruction = new Instruction('dat', 'f', p1, p2);
      var cell = new Cell(instruction);

      this.field[i] = cell;
    }
  };

  this.sanitizeAddress = function(value) {
    value = value % this.coreSize;
    if(value < 0) {
      if((value * -1) > (this.coreSize / 2)) {
        value = value + this.coreSize;
      }
    }

    return value;
  };

  this.isImmediate = function(parameter) {
    return parameter.getMode() == "#";
  };

  this.getAddress = function(pc, parameter) {
    var mode = parameter.getMode();
    var value = parameter.getValue();
    var address = pc;

    // Pre decrement
    switch(mode) {
      case "{": this.decrementAField(this.sanitizeAddress(pc + value)); break;
      case "<": this.decrementBField(this.sanitizeAddress(pc + value)); break;
    }

    switch(mode) {
      case "#": {
        address = pc;
      } break;

      case "$": {
        address = pc + value;
      } break;

      case "@":
      case "<":
      case ">": {
        var position = this.sanitizeAddress(pc + value);
        var b_nr = this.getBNumber(position);

        address = this.sanitizeAddress(b_nr + position);
      } break;

      case "*":
      case "{":
      case "}": {
        var position = this.sanitizeAddress(pc + value);
        var a_nr = this.getANumber(position);

        address = this.sanitizeAddress(a_nr + position);
      } break;

      default: {
        console.log("Unsupported addressing mode", mode);
      }
    }

    // Post increment
    switch(mode) {
      case "}": this.incrementAField(this.sanitizeAddress(pc + value)); break;
      case ">": this.incrementBField(this.sanitizeAddress(pc + value)); break;
    }

    return this.sanitizeAddress(address);
  };

  this.setANumber = function(address, value) {
    this.field[address].getInstruction().getA().setValue(value);
  };

  this.getANumber = function(address) {
    return this.field[address].getInstruction().getA().getValue();
  };

  this.setBNumber = function(address, value) {
    this.field[address].getInstruction().getB().setValue(value);
  };

  this.getBNumber = function(address) {
    return this.field[address].getInstruction().getB().getValue();
  };

  this.decrementAField = function(pc) {
    var a_nr = this.getANumber(pc);
    a_nr = this.sanitizeAddress(a_nr - 1);

    this.setANumber(pc, a_nr);

    if(this.updateCallback) this.touched.push(pc);
  };

  this.incrementAField = function(pc) {
    var a_nr = this.getANumber(pc);
    a_nr = this.sanitizeAddress(a_nr + 1);

    this.setANumber(pc, a_nr);

    if(this.updateCallback) this.touched.push(pc);
  };

  this.decrementBField = function(pc) {
    var b_nr = this.getBNumber(pc);
    b_nr = this.sanitizeAddress(b_nr - 1);

    this.setBNumber(pc, b_nr);

    if(this.updateCallback) this.touched.push(pc);
  };

  this.incrementBField = function(pc) {
    var b_nr = this.getBNumber(pc);
    b_nr = this.sanitizeAddress(b_nr + 1);

    this.setBNumber(pc, b_nr);

    if(this.updateCallback) this.touched.push(pc);
  };

  this.executeInstruction = function(pc) {
    var instruction = this.field[pc].getInstruction();
    var op = instruction.getOpcode();
    var a = instruction.getA();
    var b = instruction.getB();

    var modifier = instruction.getModifier();
    var a_adr = this.getAddress(pc, a);
    var b_adr = this.getAddress(pc, b);

    switch(op) {
      case "dat": {
        // Player dies
      } break;

      case "mov": {
        this.op.mov(this, pc, modifier, a_adr, b_adr);
        this.currentWarrior.pushPC(pc + 1);
      } break;

      case "add": {
        this.op.add(this, pc, modifier, a_adr, b_adr);
        this.currentWarrior.pushPC(pc + 1);
      } break;

      case "sub": {
        this.op.sub(this, pc, modifier, a_adr, b_adr);
        this.currentWarrior.pushPC(pc + 1);
      } break;

      case "mul": {
        this.op.mul(this, pc, modifier, a_adr, b_adr);
        this.currentWarrior.pushPC(pc + 1);
      } break;

      case "div": {
        try {
          this.op.div(this, pc, modifier, a_adr, b_adr);
          this.currentWarrior.pushPC(pc + 1);
        }
        catch(error) {
          console.log("Error at", pc, ":", error);
        }
      } break;

      case "mod": {
        this.op.mod(this, pc, modifier, a_adr, b_adr);
        this.currentWarrior.pushPC(pc + 1);
      } break;

      case "jmp": {
        this.op.jmp(this, pc, modifier, a_adr, b_adr);
      } break;

      case "jmz": {
        this.op.jmz(this, pc, modifier, a_adr, b_adr);
      } break;

      case "jmn": {
        this.op.jmz(this, pc, modifier, a_adr, b_adr);
      } break;

      case "djn": {
        this.op.djn(this, pc, modifier, a_adr, b_adr);
      } break;

      case "seq":
      case "cmp": {
        this.op.cmp(this, pc, modifier, a_adr, b_adr);
      } break;

      case "slt": {
        this.op.slt(this, pc, modifier, a_adr, b_adr);
      } break;

      case "spl": {
        this.op.spl(this, pc, modifier, a_adr, b_adr);
      } break;

      case "nop": {
        this.currentWarrior.pushPC(pc + 1);
      } break;

      default: {
        console.log(op, 'not implemented');
      }
    }

    if(this.updateCallback) {
      this.touched.push(pc);
      this.touched.push(a_adr);
      this.touched.push(b_adr);
    }
  };

  this.getRandomInt = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  this.initializField();
};

Field.prototype.getField = function() {
  return this.field;
};

/**
 * Adds a warrior to the field.
 *
 * The first warrior is load at absolute 0, every other warrior is loaded
 * at a random position with a minimum offset from every other warrior.
 *
 * If a warrior could be positioned on the field, the function returns true.
 *
 * If a warrior could not be placed on the field anymore, the function returns
 * false.
 */
Field.prototype.addWarrior = function(warrior) {
  var position = 0;

  // First warrior at position 0
  if(this.availablePositions.length === 1 &&
     this.availablePositions[0].start === 0) {
    position = 0;

    this.availablePositions[0].start = warrior.getLength();
  }
  // all but the first warrior
  else {
    var possible = [];
    var length = warrior.getLength();

    // Check in which spot the warrior fits
    for(var item in this.availablePositions) {
      var current = this.availablePositions[item];
      var space = current.end - current.start + 1;

      if(space >= length) {
        possible.push(current);
      }
    }

    // No space for this warrior
    if(possible.length < 1) {
      return false;
    }

    // Choose a random range from the available positions
    var i = this.getRandomInt(0, possible.length - 1);
    var chosen = possible[i];

    var min = chosen.start;
    var max = chosen.end - length + 1;

    // Choose a random starting point in the previously chosen range
    var position = this.getRandomInt(min, max);

    // Adjust the available possible ranges
    var temp = chosen.end;
    chosen.end = position - 1;

    var pos = {
      start: position + length,
      end: temp
    };

    this.availablePositions.push(pos);
  }

  warrior.pushPC(position + warrior.getStart());

  var code = warrior.getCode();
  for(var i = 0; i < code.length; i++) {
    var current = position + i;
    var cell = this.field[current];
    var instruction = code[i];

    cell.setInstruction(instruction);
    cell.setLastUser(warrior);
  }

  this.warriors.push(warrior);

  return true;
};

/**
 * Triggers the start of the simulation by executing the first move.
 */
Field.prototype.start = function(updateCallback, winCallback, maxCyclesCallback, suicideCallback, warriorDiedCallback) {
  this.updateCallback = updateCallback;
  this.winCallback = winCallback;
  this.maxCyclesCallback = maxCyclesCallback;
  this.suicideCallback = suicideCallback;
  this.warriorDiedCallback = warriorDiedCallback;

  this.warriorsLeft = this.warriors.length;
  this.currentWarrior = this.warriors[0];

  var that = this;
  this.trampoline(function() {
    return that.move();
  });
};

/**
 * Execute the operation of the currently active warrior if he is still alive,
 * otherwise move with the next warrior.
 *
 * If the simulation was started with only one warrior, keep on moving until
 * maxCycles is reached or until he dies.
 *
 * If the simulation was started with more than one warrior, keep on moving
 * until only one warrior is left, he is the winner.
 */
Field.prototype.move = function() {
  var that = this;

  return function() {
    if(that.currentCycle == that.maxCycles) {
      if(that.maxCyclesCallback) that.maxCyclesCallback(that.maxCycles);

      return;
    }

    var pc = that.currentWarrior.shiftPC();
    pc = that.sanitizeAddress(pc);

    that.executeInstruction(pc);

    if(!that.currentWarrior.isAlive()) {
      that.warriorsLeft -= 1;

      if(that.warriorDiedCallback) that.warriorDiedCallback(that.currentWarrior, that.currentCycle, pc);
    }

    // Single warrior suicided
    if(that.warriorsLeft === 0) {
      if(that.suicideCallback) that.suicideCallback(that.currentWarrior, that.currentCycle);

      return;
    }
    // Last warrior alive
    else if(that.warriorsLeft === 1 && that.warriors.length > 1) {
      if(that.winCallback) {
        for(var i = 0; i < that.warriors.length; i++) {
          if(that.warriors[i].isAlive()) {
            that.winCallback(that.warriors[i], that.currentCycle);
          }
        }
      }

      return;
    }

    do {
      that.currentWarriorIndex = (that.currentWarriorIndex + 1) % that.warriors.length;
      that.currentWarrior = that.warriors[that.currentWarriorIndex];
    } while(!that.currentWarrior.isAlive());

    that.currentCycle += 1;

    if(that.updateCallback) {
      that.updateCallback(that.touched, that.currentWarrior, function() {
        that.touched = [];
        that.trampoline(function() {
          return that.move();
        });
      });
    }
    else {
      return that.move();
    }
  };
};

module.exports = Field;
