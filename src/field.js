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

  // Array of touched addresses passed to the update callback
  this.touched = [];
  this.updateCallback = null;

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
    var modifier = instruction.getModifier();
    var a = instruction.getA();
    var b = instruction.getB();
    var a_adr = this.getAddress(pc, a);
    var b_adr = this.getAddress(pc, b);

    switch(op) {
      case "dat": {
        console.log("DAT executed at", pc);
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

      case "cmp": {
        this.op.cmp(this, pc, modifier, a_adr, b_adr);
      } break;

      case "slt": {
        this.op.slt(this, pc, modifier, a_adr, b_adr);
      } break;

      case "spl": {
        this.op.spl(this, pc, modifier, a_adr, b_adr);
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
  this.warriors.push(warrior);

  // TODO: the first warrior may be placed at absolute 0, all others need some
  //       padding to the first but should be placed
  var position = (this.coreSize / this.warriors.length) % 8000;
  warrior.pushPC(position + warrior.getStart());

  var code = warrior.getCode();
  for(var i = 0; i < code.length; i++) {
    var current = position + i;
    var cell = this.field[current];
    var instruction = code[i];
    cell.setInstruction(instruction);
    cell.setLastUser(warrior);
  }

  return true;
};

/**
 * Triggers the start of the simulation by executing the first move.
 */
Field.prototype.start = function(updateCallback) {
  this.updateCallback = updateCallback;
  this.warriorsLeft = this.warriors.length;

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
      console.log("max cycles reached");
      return;
    }

    that.currentWarrior = that.warriors[that.currentWarriorIndex];

    if(that.currentWarrior.isAlive()) {
      var pc = that.currentWarrior.shiftPC();
      pc = that.sanitizeAddress(pc);

      //console.log("Cycle:", that.currentCycle, 'execute', pc, that.field[pc]);
      that.executeInstruction(pc);

      if(!that.currentWarrior.isAlive()) {
        that.warriorsLeft -= 1;
        console.log("Warrior died:", that.currentWarrior);
        return;
      }
    }

    if(that.warriorsLeft === 0) {
      console.log("Single warrior died");
      return;
    }
    else if (that.warriorsLeft == 1 && that.warriors.length > 1) {
      console.log("Only one warrior is left, he is the winner");
      return;
    }

    that.currentWarriorIndex = (that.currentWarriorIndex + 1) % that.warriors.length;
    that.currentCycle += 1;

    if(that.updateCallback) {
      that.updateCallback(that.touched, function() {
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
