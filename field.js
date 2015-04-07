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

  this.field = []
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
      fn = fn()
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
    var pc = pc;
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
      }; break;

      case "$": {
        address = pc + value;
      }; break;

      case "@":
      case "<":
      case ">": {
        var position = this.sanitizeAddress(pc + value);
        var b_nr = this.getBNumber(position);

        address = this.sanitizeAddress(b_nr + position);
      }; break;

      case "*":
      case "{":
      case "}": {
        var position = this.sanitizeAddress(pc + value);
        var a_nr = this.getANumber(position);

        address = this.sanitizeAddress(a_nr + position);
      }; break;

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

    switch(op) {
      case "dat": {
        // TODO: check if address modes should be processed
        console.log("DAT executed at", pc);
      }; break;

      case "mov": {
        this.mov(pc, modifier, a, b);
        this.currentWarrior.pushPC(pc + 1);
      }; break;

      case "add": {
        this.add(pc, modifier, a, b);
        this.currentWarrior.pushPC(pc + 1);
      }; break;

      case "sub": {
        this.sub(pc, modifier, a, b);
        this.currentWarrior.pushPC(pc + 1);
      }; break;

      case "mul": {
        this.mul(pc, modifier, a, b);
        this.currentWarrior.pushPC(pc + 1);
      }; break;

      case "div": {
        try {
          this.div(pc, modifier, a, b);
          this.currentWarrior.pushPC(pc + 1);
        }
        catch(error) {
          console.log("Error at", pc, ":", error);
        }
      }; break;

      case "mod": {
        this.mod(pc, modifier, a, b);
        this.currentWarrior.pushPC(pc + 1);
      }; break;

      case "jmp": {
        this.jmp(pc, modifier, a, b);
      }; break;

      case "jmz": {
        this.jmz(pc, modifier, a, b);
      }; break;

      case "jmn": {
        this.jmz(pc, modifier, a, b);
      }; break;

      case "djn": {
        this.djn(pc, modifier, a, b);
      }; break;

      case "cmp": {
        this.cmp(pc, modifier, a, b);
      }; break;

      case "slt": {
        this.slt(pc, modifier, a, b);
      }; break;

      case "spl": {
        this.spl(pc, modifier, a, b);
      }; break;

      default: {
        console.log(op, 'not implemented');
      }
    }
  };

  this.getANumber = function(address) {
    return this.field[address].getInstruction().getA().getValue();
  };

  this.setANumber = function(address, value) {
    this.field[address].getInstruction().getA().setValue(value);
  }

  this.getBNumber = function(address) {
    return this.field[address].getInstruction().getB().getValue();
  };

  this.setBNumber = function(address, value) {
    this.field[address].getInstruction().getB().setValue(value);
  }

  /**
   * Opcode implementations
   */

  this.mov = function(pc, modifier, a, b) {
    var touched = [];
    var a_adr = this.getAddress(pc, a);
    var b_adr = this.getAddress(pc, b);

    switch(modifier) {
      /**
       * copy instruction from A address to instruction at B address
       */
      case "i": {
        var instruction = this.field[a_adr];

        this.field[b_adr] = Object.create(instruction);
      }; break;

      /**
       * copy A-number of A address to A-number of B address
       */
      case "a": {
        var a_nr = this.getANumber(a_adr);

        this.setANumber(b_adr, a_nr);
      }; break;

      /**
       * copy B-number of A address to B-number of B address
       */
      case "b": {
        var b_nr = this.getBNumber(a_adr);

        this.setBNumber(b_adr, b_nr);
      }; break;

      /**
       * copy A-number of A address to B-number of B address
      */
      case "ab": {
        var a_nr = this.getANumber(a_adr);

        this.setBNumber(b_adr, a_nr);
      }; break;

      /**
       * copy B-number of A address to A-number of B address
       */
      case "ba": {
        var b_nr = this.getBNumber(a_adr);

        this.setANumber(b_adr, b_nr);
      }; break;

      /**
       * copy A-number of A address to A-number of B address
       * copy B-number of A address to B-number of B address
       */
      case "f": {
        var a_nr = this.getANumber(a_adr);
        var b_nr = this.getBNumber(a_adr);

        this.setANumber(b_adr, a_nr);
        this.setBNumber(b_adr, b_nr);
      }; break;

      /**
       * copy A-number of A address to B-number of B address
       * copy B-number of A address to A-number of B address
       */
      case "x": {
          var a_nr = this.getANumber(a_adr);
          var b_nr = this.getBNumber(a_adr);

          this.setANumber(b_adr, b_nr);
          this.setBNumber(b_adr, a_nr);
      }; break;

      // Unknown modifier
      default: {
        console.log("MOV - unknown modifier:", modifier);
      }
    }

    if(this.updateCallback) {
      this.field[a_adr].setLastAction("read");
      this.field[b_adr].setLastAction("write");
      this.field[b_adr].setLastUser(this.currentWarrior);

      this.touched.push(pc);
      this.touched.push(a_adr);
      this.touched.push(b_adr);
    }
  };

  this.add = function(pc, modifier, a, b) {
    var touched = [];
    var a_adr = this.getAddress(pc, a);
    var b_adr = this.getAddress(pc, b);

    switch(modifier) {
      /**
       * add A-number of A address to A-number of B address
       * add B-number of A address to B-number of B address
       */
      case "f":
      case "i": {
        var a_nr = this.getANumber(a_adr);
        a_nr += this.getANumber(b_adr);
        a_nr = this.sanitizeAddress(a_nr);

        var b_nr = this.getBNumber(a_adr);
        b_nr += this.getBNumber(b_adr);
        b_nr = this.sanitizeAddress(b_nr);

        this.setANumber(b_adr, a_nr);
        this.setBNumber(b_adr, b_nr);
      }; break;

      /**
       * add A-number of A address to A-number of B address
       */
      case "a": {
        var a_nr = this.getANumber(a_adr);
        a_nr += this.getANumber(b_adr);
        a_nr = this.sanitizeAddress(a_nr);

        this.setANumber(b_adr, a_nr);
      }; break;

      /**
       * add B-number of A address to B-number of B address
       */
      case "b": {
        var b_nr = this.getBNumber(a_adr);
        b_nr += this.getBNumber(b_adr);
        b_nr = this.sanitizeAddress(b_nr);

        this.setBNumber(b_adr, b_nr);
      }; break;

      /**
       * add A-number of A address to B-number of B address
       */
      case "ab": {
        var a_nr = this.getANumber(a_adr);
        a_nr += this.getBNumber(b_adr);
        a_nr = this.sanitizeAddress(a_nr);

        this.setBNumber(b_adr, a_nr);
      }; break;

      /**
       * add B-number of A address to A-number of B address
       */
      case "ba": {
        var b_nr = this.getBNumber(a_adr);
        b_nr += this.getANumber(b_adr);
        b_nr = this.sanitizeAddress(b_nr);

        this.setBNumber(b_adr, b_nr);
      }; break;

      /**
       * add A-number of A address to B-number of B address
       * add B-number of A address to A-number of B address
       */
      case "x": {
        var a_nr = this.getANumber(a_adr);
        a_nr += this.getBNumber(b_adr);
        a_nr = this.sanitizeAddress(a_nr);

        var b_nr = this.getBNumber(a_adr);
        b_nr += this.getANumber(b_adr);
        b_nr = this.sanitizeAddress(b_nr);

        this.setANumber(b_adr, b_nr);
        this.setBNumber(b_adr, a_nr);
      }; break;

      // Unknown modifier
      default: {
        console.log("ADD - unknown modifier:", modifier);
      }
    }

    if(this.updateCallback) {
      this.field[a_adr].setLastAction("read");
      this.field[b_adr].setLastAction("write");
      this.field[b_adr].setLastUser(this.currentWarrior);

      this.touched.push(pc);
      this.touched.push(a_adr);
      this.touched.push(b_adr);
    }
  };

  this.sub = function(pc, modifier, a, b) {
    var touched = [];
    var a_adr = this.getAddress(pc, a);
    var b_adr = this.getAddress(pc, b);

    switch(modifier) {
      /**
       * subtract A-number of A address from A-number of B address
       * subtract B-number of A address from B-number of B address
       */
      case "f":
      case "i": {
        var a_nr = this.getANumber(b_adr);
        a_nr -= this.getANumber(a_adr);
        a_nr = this.sanitizeAddress(a_nr);

        var b_nr = this.getBNumber(b_adr);
        b_nr -= this.getBNumber(a_adr);
        b_nr = this.sanitizeAddress(b_nr);

        this.setANumber(b_adr, a_nr);
        this.setBNumber(b_adr, b_nr);
      }; break;

      /**
       * subtract A-number of A address from A-number of B address
       */
      case "a": {
        var a_nr = this.getANumber(b_adr);
        a_nr -= this.getANumber(a_adr);
        a_nr = this.sanitizeAddress(a_nr);

        this.setANumber(b_adr, a_nr);
      }; break;

      /**
       * subtract B-number of A address from B-number of B address
       */
      case "b": {
        var b_nr = this.getBNumber(b_adr);
        b_nr -= this.getBNumber(a_adr);
        b_nr = this.sanitizeAddress(b_nr);

        this.setBNumber(b_adr, b_nr);
      }; break;

      /**
       * subtract A-number of A address from B-number of B address
       */
      case "ab": {
        var a_nr = this.getBNumber(b_adr);
        a_nr -= this.getANumber(a_adr);
        a_nr = this.sanitizeAddress(a_nr);

        this.setBNumber(b_adr, a_nr);
      }; break;

      /**
       * subtract B-number of A address from A-number of B address
       */
      case "ba": {
        var b_nr = this.getANumber(b_adr);
        b_nr -= this.getBNumber(a_adr);
        b_nr = this.sanitizeAddress(b_nr);

        this.setANumber(b_adr, b_nr);
      }; break;

      /**
       * subtract A-number of A address from B-number of B address
       * subtract B-number of A address from A-number of B address
       */
      case "x": {
        var a_nr = this.getBNumber(b_adr);
        a_nr -= this.getANumber(a_adr);
        a_nr = this.sanitizeAddress(a_nr);

        var b_nr = this.getANumber(b_adr);
        b_nr -= this.getBNumber(a_adr);
        b_nr = this.sanitizeAddress(b_nr);

        this.setBNumber(b_adr, a_nr);
        this.setANumber(b_adr, b_nr);
      }; break;

      // Unknown modifier
      default: {
        console.log("SUB - unknown modifier:", modifier);
      }
    }

    if(this.updateCallback) {
      this.field[a_adr].setLastAction("read");
      this.field[b_adr].setLastAction("write");
      this.field[b_adr].setLastUser(this.currentWarrior);

      this.touched.push(pc);
      this.touched.push(a_adr);
      this.touched.push(b_adr);
    }
  };

  this.mul = function(pc, modifier, a, b) {
    var touched = [];
    var a_adr = this.getAddress(pc, a);
    var b_adr = this.getAddress(pc, b);

    switch(modifier) {
      /**
       * multiply A-number of A address with A-number of B address
       * multiply B-number of A address with B-number of B address
       */
      case "f":
      case "i": {
        var a_nr = this.getANumber(b_adr);
        a_nr *= this.getANumber(a_adr);
        a_nr = this.sanitizeAddress(a_nr);

        var b_nr = this.getBNumber(b_adr);
        b_nr *= this.getBNumber(a_adr);
        b_nr = this.sanitizeAddress(b_nr);

        this.setANumber(b_adr, a_nr);
        this.setBNumber(b_adr, b_nr);
      }; break;

      /**
       * multiply A-number of A address with A-number of B address
       */
      case "a": {
        var a_nr = this.getANumber(b_adr);
        a_nr *= this.getANumber(a_adr);
        a_nr = this.sanitizeAddress(a_nr);

        this.setANumber(b_adr, a_nr);
      }; break;

      /**
       * multiply B-number of A address with B-number of B address
       */
      case "b": {
        var b_nr = this.getBNumber(b_adr);
        b_nr *= this.getBNumber(a_adr);
        b_nr = this.sanitizeAddress(b_nr);

        this.setBNumber(b_adr, b_nr);
      }; break;

      /**
       * multiply A-number of A address with B-number of B address
       */
      case "ab": {
        var a_nr = this.getBNumber(b_adr);
        a_nr *= this.getANumber(a_adr);
        a_nr = this.sanitizeAddress(a_nr);

        this.setBNumber(b_adr, a_nr);
      }; break;

      /**
       * multiply B-number of A address with A-number of B address
       */
      case "ba": {
        var b_nr = this.getANumber(b_adr);
        b_nr *= this.getBNumber(a_adr);
        b_nr = this.sanitizeAddress(b_nr);

        this.setANumber(b_adr, b_nr);
      }; break;

      /**
       * multiply A-number of A address with B-number of B address
       * multiply B-number of A address with A-number of B address
       */
      case "x": {
        var a_nr = this.getBNumber(b_adr);
        a_nr *= this.getANumber(a_adr);
        a_nr = this.sanitizeAddress(a_nr);

        var b_nr = this.getANumber(b_adr);
        b_nr *= this.getBNumber(a_adr);
        b_nr = this.sanitizeAddress(b_nr);

        this.setBNumber(b_adr, a_nr);
        this.setANumber(b_adr, b_nr);
      }; break;

      // Unknown modifier
      default: {
        console.log("MUL - unknown modifier:", modifier);
      }
    }

    if(this.updateCallback) {
      this.field[a_adr].setLastAction("read");
      this.field[b_adr].setLastAction("write");
      this.field[b_adr].setLastUser(this.currentWarrior);

      this.touched.push(pc);
      this.touched.push(a_adr);
      this.touched.push(b_adr);
    }
  };

  this.div = function(pc, modifier, a, b) {
    var touched = [];
    var a_adr = this.getAddress(pc, a);
    var b_adr = this.getAddress(pc, b);

    switch(modifier) {
      /**
       * divide A-number of B address by A-number of A address
       * divide B-number of B address by B-number of A address
       */
      case "f":
      case "i": {
        var a_nr = this.getANumber(b_adr);
        a_nr /= this.getANumber(a_adr);
        a_nr = this.sanitizeAddress(a_nr);

        var b_nr = this.getBNumber(b_adr);
        b_nr /= this.getBNumber(a_adr);
        b_nr = this.sanitizeAddress(b_nr);

        if(isNaN(a_nr) || isNaN(b_nr)) {
          throw "Division by 0";
          return;
        }

        this.setANumber(b_adr, a_nr);
        this.setBNumber(b_adr, b_nr);
      }; break;

      /**
       * divide A-number of B address by A-number of A address
       */
      case "a": {
        var a_nr = this.getANumber(b_adr);
        a_nr /= this.getANumber(a_adr);
        a_nr = this.sanitizeAddress(a_nr);

        if(isNaN(a_nr)) {
          throw "Division by 0";
          return;
        }

        this.setANumber(b_adr, a_nr);
      }; break;

      /**
       * divide B-number of B address by B-number of A address
       */
      case "b": {
        var b_nr = this.getBNumber(b_adr);
        b_nr /= this.getBNumber(a_adr);
        b_nr = this.sanitizeAddress(b_nr);

        if(isNaN(b_nr)) {
          throw "Division by 0";
          return;
        }

        this.setBNumber(b_adr, b_nr);
      }; break;

      /**
       * divide B-number of B address by A-number of A address
       */
      case "ab": {
        var a_nr = this.getBNumber(b_adr);
        a_nr /= this.getANumber(a_adr);
        a_nr = this.sanitizeAddress(a_nr);

        if(isNaN(a_nr)) {
          throw "Division by 0";
          return;
        }

        this.setBNumber(b_adr, a_nr);
      }; break;

      /**
       * divide A-number of B address by B-number of A address
       */
      case "ba": {
        var b_nr = this.getANumber(b_adr);
        b_nr /= this.getBNumber(a_adr);
        b_nr = this.sanitizeAddress(b_nr);

        if(isNaN(b_nr)) {
          throw "Division by 0";
          return;
        }

        this.setANumber(b_adr, b_nr);
      }; break;

      /**
       * divide B-number of B address by A-number of A address
       * divide A-number of B address by B-number of A address
       */
      case "x": {
        var a_nr = this.getBNumber(b_adr);
        a_nr /= this.getANumber(a_adr);
        a_nr = this.sanitizeAddress(a_nr);

        var b_nr = this.getANumber(b_adr);
        b_nr /= this.getBNumber(a_adr);
        b_nr = this.sanitizeAddress(b_nr);

        if(isNaN(a_nr) || isNaN(b_nr)) {
          throw "Division by 0";
          return;
        }

        this.setBNumber(b_adr, a_nr);
        this.setANumber(b_adr, b_nr);
      }; break;

      // Unknown modifier
      default: {
        console.log("DIV - unknown modifier:", modifier);
      }
    }

    if(this.updateCallback) {
      this.field[a_adr].setLastAction("read");
      this.field[b_adr].setLastAction("write");
      this.field[b_adr].setLastUser(this.currentWarrior);

      this.touched.push(pc);
      this.touched.push(a_adr);
      this.touched.push(b_adr);
    }
  };

  this.mod = function(pc, modifier, a, b) {
    var touched = [];
    var a_adr = this.getAddress(pc, a);
    var b_adr = this.getAddress(pc, b);

    switch(modifier) {
      /**
       * mod A-number of B address by A-number of A address
       * mod B-number of B address by B-number of A address
       */
      case "f":
      case "i": {
        var a_nr = this.getANumber(b_adr);
        a_nr %= this.getANumber(a_adr);
        a_nr = this.sanitizeAddress(a_nr);

        var b_nr = this.getBNumber(b_adr);
        b_nr %= this.getBNumber(a_adr);
        b_nr = this.sanitizeAddress(b_nr);

        this.setANumber(b_adr, a_nr);
        this.setBNumber(b_adr, b_nr);
      }; break;

      /**
       * mod A-number of B address by A-number of A address
       */
      case "a": {
        var a_nr = this.getANumber(b_adr);
        a_nr %= this.getANumber(a_adr);
        a_nr = this.sanitizeAddress(a_nr);

        this.setANumber(b_adr, a_nr);
      }; break;

      /**
       * mod B-number of B address by B-number of A address
       */
      case "b": {
        var b_nr = this.getBNumber(b_adr);
        b_nr %= this.getBNumber(a_adr);
        b_nr = this.sanitizeAddress(b_nr);

        this.setBNumber(b_adr, b_nr);
      }; break;

      /**
       * mod B-number of B address by A-number of A address
       */
      case "ab": {
        var a_nr = this.getBNumber(b_adr);
        a_nr %= this.getANumber(a_adr);
        a_nr = this.sanitizeAddress(a_nr);

        this.setBNumber(b_adr, a_nr);
      }; break;

      /**
       * mod A-number of B address by B-number of A address
       */
      case "ba": {
        var b_nr = this.getANumber(b_adr);
        b_nr %= this.getBNumber(a_adr);
        b_nr = this.sanitizeAddress(b_nr);

        this.setANumber(b_adr, b_nr);
      }; break;

      /**
       * mod B-number of B address by A-number of A address
       * mod A-number of B address by B-number of A address
       */
      case "x": {
        var a_nr = this.getBNumber(b_adr);
        a_nr %= this.getANumber(a_adr);
        a_nr = this.sanitizeAddress(a_nr);

        var b_nr = this.getANumber(b_adr);
        b_nr %= this.getBNumber(a_adr);
        b_nr = this.sanitizeAddress(b_nr);

        this.setBNumber(b_adr, a_nr);
        this.setANumber(b_adr, b_nr);
      }; break;

      default: {
        console.log("MOD - unknown modifier:", modifier);
      }
    }

    if(this.updateCallback) {
      this.field[a_adr].setLastAction("read");
      this.field[b_adr].setLastAction("write");
      this.field[b_adr].setLastUser(this.currentWarrior);

      this.touched.push(pc);
      this.touched.push(a_adr);
      this.touched.push(b_adr);
    }
  };

  this.jmp = function(pc, modifier, a, b) {
    var touched = [];
    var a_adr = this.getAddress(pc, a);
    var b_adr = this.getAddress(pc, b);

    switch(modifier) {
      case "a":
      case "b":
      case "ab":
      case "ba":
      case "x":
      case "f":
      case "i": {
        this.currentWarrior.pushPC(a_adr);
      }; break;

      default: {
        console.log("JMP - unknown modifier:", modifier);
      }
    }

    if(this.updateCallback) {
      this.field[a_adr].setLastAction("read");

      this.touched.push(pc);
      this.touched.push(a_adr);
      this.touched.push(b_adr);
    }
  };

  this.jmz = function(pc, modifier, a, b) {
    var touched = [];
    var a_adr = this.getAddress(pc, a);
    var b_adr = this.getAddress(pc, b);

    switch(modifier) {
      /**
       * jump to A address if A-number of B address is 0
       * else: increase the counter by one
       */
      case "a":
      case "ba": {
        var address = pc +1;
        var a_nr = this.getANumber(b_adr);
        if(a_nr == 0) {
          address = a_adr;
        }
        address = this.sanitizeAddress(address);

        this.currentWarrior.pushPC(address);
      }; break;

      /**
       * jump to A address if B-number of B address is 0
       * else: increase the counter by one
       */
      case "b":
      case "ab": {
        var address = pc + 1;
        var b_nr = this.getBNumber(b_adr);
        if(b_nr == 0) {
          address = a_adr;
        }
        address = this.sanitizeAddress(address);

        this.currentWarrior.pushPC(address);
      }; break;

      /**
       * jump to A address if A-number and B-number of B address are 0
       * else: increase the counter by one
       */
      case "x":
      case "f":
      case "i": {
        var address = pc + 1;
        var a_nr = this.getANumber(b_adr);
        var b_nr = this.getBNumber(b_adr);
        if(a_nr == 0 && b_nr == 0) {
          address = a_adr;
        }
        address = this.sanitizeAddress(address);

        this.currentWarrior.pushPC(address);
      }; break;

      default: {
        console.log("JMZ - unknown modifier:", modifier);
      }
    }

    if(this.updateCallback) {
      this.field[a_adr].setLastAction("read");

      this.touched.push(pc);
      this.touched.push(a_adr);
      this.touched.push(b_adr);
    }
  };

  this.jmn = function(pc, modifier, a, b) {
    var touched = [];
    var a_adr = this.getAddress(pc, a);
    var b_adr = this.getAddress(pc, b);

    switch(modifier) {
      /**
       * decrement A-number of B Address
       * decrement A-number
       * else: increase the counter by one
       */
      case "a":
      case "ba": {
        var address = pc +1;
        var a_nr = this.getANumber(b_adr);
        if(a_nr != 0) {
          address = a_adr;
        }

        this.currentWarrior.pushPC(address);
      }; break;

      /**
       * jump to A address if B-number of B address is not 0
       * else: increase the counter by one
       */
      case "b":
      case "ab": {
        var address = pc + 1;
        var b_nr = this.getBNumber(b_adr);
        if(b_nr != 0) {
          address = a_adr;
        }

        this.currentWarrior.pushPC(address);
      }; break;

      /**
       * jump to A address if either A-number or B-number of B address is not 0
       * else: increase the counter by one
       */
      case "f":
      case "x":
      case "i": {
        var address = pc + 1;
        var a_nr = this.getANumber(b_adr);
        var b_nr = this.getBNumber(b_adr);
        if(a_nr != 0 && b_nr != 0) {
          address = a_adr;
        }

        this.currentWarrior.pushPC(address);
      }; break;

      default: {
        console.log("JMN - unknown modifier:", modifier);
      }
    }

    if(this.updateCallback) {
      this.field[a_adr].setLastAction("read");

      this.touched.push(pc);
      this.touched.push(a_adr);
      this.touched.push(b_adr);
    }
  };

  this.djn = function(pc, modifier, a, b) {
    var touched = [];
    var a_adr = this.getAddress(pc, a);
    var b_adr = this.getAddress(pc, b);

    switch(modifier) {
      /**
       * decrement A-number at B address
       * if A-number at B address not 0: jump to A address
       * else: increase the counter by one
       */
      case "a":
      case "ba": {
        var address = pc + 1;
        var a_nr = this.getANumber(a_adr);
        a_nr = this.sanitizeAddress(a_nr - 1);
        this.setANumber(b_adr, a_nr);

        if(a_nr != 0) {
          address = a_adr;
        }
        address = this.sanitizeAddress(address);

        this.currentWarrior.pushPC(address);
      }; break;

      /**
       * decrement B-number at B address
       * if B-number at B address not 0: jump to A address
       * else: increase the counter by one
       */
      case "b":
      case "ab": {
        var address = pc + 1;

        // decrement B-number at B address
        var b_nr = this.getBNumber(b_adr);
        b_nr = this.sanitizeAddress(b_nr - 1);
        this.setBNumber(b_adr, b_nr);

        if(b_nr != 0) {
          address = a_adr;
        }
        address = this.sanitizeAddress(address);

        this.currentWarrior.pushPC(address);
      }; break;

      /**
       * decrement A-number at B address
       * decrement B-number at B address
       * if A-number or B-number at B address not 0: jump to A address
       * else: increase the counter by one
       */
      case "f":
      case "x":
      case "i": {
        var address = pc + 1;

        var a_nr = this.getANumber(b_adr);
        a_nr = this.sanitizeAddress(a_nr - 1);
        this.setANumber(b_adr, a_nr);

        var b_nr = this.getBNumber(b_adr);
        b_nr = this.sanitizeAddress(a_nr - 1);
        this.setBNumber(b_adr, b_nr);

        if(a_nr != 0 || b_nr != 0) {
          address = a_adr;
        }
        address = this.sanitizeAddress(address);

        this.currentWarrior.pushPC(address);
      }; break;

      default: {
        console.log("DJN - unknown modifier:", modifier);
      }
    }

    if(this.updateCallback) {
      this.field[a_adr].setLastAction("read");

      this.touched.push(pc);
      this.touched.push(a_adr);
      this.touched.push(b_adr);
    }
  };

  this.cmp = function(pc, modifier, a, b) {
    var touched = [];
    var a_adr = this.getAddress(pc, a);
    var b_adr = this.getAddress(pc, b);

    switch(modifier) {
      /**
       * A-number at A address == A-number at B address: pc + 2
       * else: pc + 1
       */
      case "a": {
        var address = pc + 1;
        var a_nr_a = this.getANumber(a_adr);
        var a_nr_b = this.getANumber(b_adr);

        if(a_nr_a == a_nr_b) {
          address = pc + 2;
        }
        address = this.sanitizeAddress(address);

        this.currentWarrior.pushPC(address);
      }; break;

      /**
       * B-number at A address == B-number at B address: pc + 2
       * else: pc + 1
       */
      case "b": {
        var address = pc + 1;
        var b_nr_a = this.getBNumber(a_adr);
        var b_nr_b = this.getBNumber(b_adr);

        if(b_nr_a == b_nr_b) {
          address = pc + 2;
        }
        address = this.sanitizeAddress(address);

        this.currentWarrior.pushPC(address);
      }; break;

      /**
       * A-number at A address == B-number at B address: pc + 2
       * else: pc + 1
       */
      case "ab": {
        var address = pc + 1;
        var a_nr_a = this.getANumber(a_adr);
        var b_nr_b = this.getBNumber(b_adr);

        if(a_nr_a == b_nr_b) {
          address = pc + 2;
        }
        address = this.sanitizeAddress(address);

        this.currentWarrior.pushPC(address);
      }; break;

      /**
       * B-number at A address == A-number at B address: pc + 2
       * else: pc + 1
       */
      case "ba": {
        var address = pc + 1;
        var b_nr_a = this.getBNumber(a_adr);
        var a_nr_b = this.getANumber(b_adr);

        if(b_nr_a == a_nr_b) {
          address = pc + 2;
        }
        address = this.sanitizeAddress(address);

        this.currentWarrior.pushPC(address);
      }; break;

      /**
       * A-number at A address == A-number at B address AND
       * B-number at A address == B-number at B address: pc + 2
       * else: pc + 1
       */
      case "f": {
        var address = pc + 1;
        var a_nr_a = this.getANumber(a_adr);
        var a_nr_b = this.getANumber(b_adr);
        var b_nr_a = this.getBNumber(a_adr);
        var b_nr_b = this.getBNumber(b_adr);

        if((a_nr_a == a_nr_b) && (b_nr_a == b_nr_b)) {
          address = pc + 2;
        }
        address = this.sanitizeAddress(address);

        this.currentWarrior.pushPC(address);
      }; break;

      /**
       * A-number at A address == B-number at B address AND
       * B-number at A address == A-number at B address: pc + 2
       * else: pc + 1
       */
      case "x": {
        var address = pc + 1;
        var a_nr_a = this.getANumber(a_adr);
        var a_nr_b = this.getANumber(b_adr);
        var b_nr_a = this.getBNumber(a_adr);
        var b_nr_b = this.getBNumber(b_adr);

        if((a_nr_a == b_nr_b) && (b_nr_a == a_nr_b)) {
          address = pc + 2;
        }
        address = this.sanitizeAddress(address);

        this.currentWarrior.pushPC(address);
      }; break;

      /**
       * Instruction at A address == Instruction at B address: pc + 2
       * else: pc + 1
       */
      case "i": {
        var address = pc + 1;
        var a = this.field[a_adr].getInstruction();
        var b = this.field[b_adr].getInstruction();

        if((a.getOpcode() == b.getOpcode()) &&
           (a.getModifier() == b.getModifier()) &&
           (a.getA().getValue() == b.getA().getValue()) &&
           (a.getA().getMode() == b.getA().getMode()) &&
           (a.getB().getValue() == b.getB().getValue()) &&
           (a.getB().getMode() == b.getB().getMode())
          ) {
          address = pc + 2;
        }
        address = this.sanitizeAddress(address);

        this.currentWarrior.pushPC(address);
      }; break;

      // Unknown modifier
      default: {
        console.log("CMP - unknown modifier:", modifier);
      }
    }

    if(this.updateCallback) {
      this.field[a_adr].setLastAction("read");
      this.field[b_adr].setLastAction("read");

      this.touched.push(pc);
      this.touched.push(a_adr);
      this.touched.push(b_adr);
    }
  };

  this.slt = function(pc, modifier, a, b) {
    var touched = [];
    var a_adr = this.getAddress(pc, a);
    var b_adr = this.getAddress(pc, b);

    switch(modifier) {
      /**
       * A-number at A address < A-number at B address: pc + 2
       * else: pc + 1
       */
      case "a": {
        var address = pc + 1;
        var a_nr_a = this.getANumber(a_adr);
        var a_nr_b = this.getANumber(b_adr);

        if(a_nr_a < a_nr_b) {
          address = pc + 2;
        }
        address = this.sanitizeAddress(address);

        this.currentWarrior.pushPC(address);
      }; break;

      /**
       * B-number at A address < B-number at B address: pc + 2
       * else: pc + 1
       */
      case "b": {
        var address = pc + 1;
        var b_nr_a = this.getBNumber(a_adr);
        var b_nr_b = this.getBNumber(b_adr);

        if(b_nr_a < b_nr_b) {
          address = pc + 2;
        }
        address = this.sanitizeAddress(address);

        this.currentWarrior.pushPC(address);
      }; break;

      /**
       * A-number at A address < B-number at B address: pc + 2
       * else: pc + 1
       */
      case "ab": {
        var address = pc + 1;
        var a_nr_a = this.getANumber(a_adr);
        var b_nr_b = this.getBNumber(b_adr);

        if(a_nr_a < b_nr_b) {
          address = pc + 2;
        }
        address = this.sanitizeAddress(address);

        this.currentWarrior.pushPC(address);
      }; break;

      /**
       * B-number at A address < A-number at B address: pc + 2
       * else: pc + 1
       */
      case "ba": {
        var address = pc + 1;
        var b_nr_a = this.getBNumber(a_adr);
        var a_nr_b = this.getANumber(b_adr);

        if(b_nr_a < a_nr_b) {
          address = pc + 2;
        }
        address = this.sanitizeAddress(address);

        this.currentWarrior.pushPC(address);
      }; break;

      /**
       * A-number at A address < A-number at B address AND
       * B-number at A address < B-number at B address: pc + 2
       * else: pc + 1
       */
      case "f":
      case "i": {
        var address = pc + 1;
        var a_nr_a = this.getANumber(a_adr);
        var a_nr_b = this.getANumber(b_adr);
        var b_nr_a = this.getBNumber(a_adr);
        var b_nr_b = this.getBNumber(b_adr);

        if((a_nr_a < a_nr_b) && (b_nr_a < b_nr_b)) {
          address = pc + 2;
        }
        address = this.sanitizeAddress(address);

        this.currentWarrior.pushPC(address);
      }; break;

      /**
       * A-number at A address < B-number at B address AND
       * B-number at A address < A-number at B address: pc + 2
       * else: pc + 1
       */
      case "x": {
        var address = pc + 1;
        var a_nr_a = this.getANumber(a_adr);
        var a_nr_b = this.getANumber(b_adr);
        var b_nr_a = this.getBNumber(a_adr);
        var b_nr_b = this.getBNumber(b_adr);

        if((a_nr_a < b_nr_b) && (b_nr_a < a_nr_b)) {
          address = pc + 2;
        }
        address = this.sanitizeAddress(address);

        this.currentWarrior.pushPC(address);
      }; break;

      // Unknown modifier
      default: {
        console.log("CMP - unknown modifier:", modifier);
      }
    }

    if(this.updateCallback) {
      this.field[a_adr].setLastAction("read");
      this.field[b_adr].setLastAction("read");

      this.touched.push(pc);
      this.touched.push(a_adr);
      this.touched.push(b_adr);
    }
  };

  this.spl = function(pc, modifier, a, b) {
    var touched = [];
    var a_adr = this.getAddress(pc, a);
    var b_adr = this.getAddress(pc, b);

    switch(modifier) {
      case "a":
      case "b":
      case "ab":
      case "ba":
      case "x":
      case "f":
      case "i": {
        this.currentWarrior.pushPC(pc + 1);
        this.currentWarrior.pushPC(a_adr);
      }; break;

      default: {
        console.log("SPL - unknown modifier:", modifier);
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
  this.warriors.push(warrior)

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
      var pc = that.currentWarrior.shiftPC()
      pc = that.sanitizeAddress(pc);

      //console.log("Cycle:", that.currentCycle, 'execute', pc, that.field[pc]);
      that.executeInstruction(pc);

      if(!that.currentWarrior.isAlive()) {
        that.warriorsLeft -= 1;
        console.log("Warrior died:", that.currentWarrior);
        return;
      }
    }

    if(that.warriorsLeft == 0) {
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
  }
};

module.exports = Field;
