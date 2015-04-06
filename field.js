/**
 * The playing field consists of a memory aray that is linked from the last to
 * the first element and the size of coreSize.
 */
var Field = function(coreSize) {
  this.coreSize = coreSize;
  this.maxCycles = 80000;

  this.field = []
  this.warriors = [];
  this.currentWarrior = 0;

  this.updateCallback = null;

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
      if((value * -1) > (this.coreSize /2)) {
        value = value + this.coreSize;
      }
    }

    if(value > (this.coreSize /2)) {
      value = this.coreSize - value;
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
    var address = null;

    // Pre decrement
    switch(mode) {
      case "{": this.decrementAField(value); break;
      case "<": this.decrementBField(value); break;
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
        // get the value of the b field from pc+value
        var position = (pc + value) % this.coreSize;
        var instruction = this.field[position].getInstruction();
        address = instruction.getB().getValue();
      }; break;

      case "*":
      case "{":
      case "}": {
        // get the value of the a field from pc+value
        var position = (pc + value) % this.coreSize;
        var instruction = this.field[position].getInstruction();
        address = instruction.getA().getValue();
      }; break;

      default: {
        console.log("Unsupported addressing mode", mode);
      }
    }

    // Post increment
    switch(mode) {
      case "}": this.incrementAField(value); break;
      case ">": this.incrementBField(value); break;
    }

    return this.sanitizeAddress(address);
  };

  this.decrementAField = function(pc) {
    var a = this.field[pc].getInstruction().getA();
    var value = a.getValue();
    value -= 1;
    value = this.sanitizeAddress(value);

    if(this.updateCallback) this.updateCallback([value]);

    a.setValue(value);
  };

  this.incrementAField = function(pc) {
    var a = this.field[pc].getInstruction().getA();
    var value = a.getValue();
    value += 1;
    value = this.sanitizeAddress(value);

    if(this.updateCallback) this.updateCallback(value);

    a.setValue(value);
  };

  this.decrementBField = function(pc) {
    var b = this.field[pc].getInstruction().getB();
    var value = b.getValue();
    value -= 1;
    value = this.sanitizeAddress(value);

    if(this.updateCallback) this.updateCallback(value);

    b.setValue(value);
  };

  this.incrementBField = function(pc) {
    var b = this.field[pc].getInstruction().getB();
    var value = b.getValue();
    value += 1;
    value = this.sanitizeAddress(value);

    if(this.updateCallback) this.updateCallback(value);

    b.setValue(value);
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
        throw "kill process";
      }; break;

      case "mov": {
        this.mov(pc, modifier, a, b);
        this.warriors[this.currentWarrior].increasePC();
      }; break;

      case "add": {
        this.add(pc, modifier, a, b);
        this.warriors[this.currentWarrior].increasePC();
      }; break;

      case "sub": {
        this.sub(pc, modifier, a, b);
        this.warriors[this.currentWarrior].increasePC();
      }; break;

      case "mul": {
        this.mul(pc, modifier, a, b);
        this.warriors[this.currentWarrior].increasePC();
      }; break;

      case "div": {
        try {
          this.div(pc, modifier, a, b);
          this.warriors[this.currentWarrior].increasePC();
        }
        catch(error) {
          console.log("Division by zero");
          throw "kill process";
        }
      }; break;

      case "mod": {
        this.mod(pc, modifier, a, b);
        this.warriors[this.currentWarrior].increasePC();
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

      case "sltx": {

      }; break;

      case "splx": {

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
    switch(modifier) {
      /**
       * Use and write entire instructions
       *
       * + a & b are immediate: do nothing
       * + b is immediate: only process a mode
       * + else: copy instruction from A address to B address
       */
      case "i": {
        if(this.isImmediate(a) && this.isImmediate(b)) {
          touched.push(pc);
        }
        else if(this.isImmediate(b)) {
          a_adr = this.getAddress(a);
          touched.push(pc);
          touched.push(a_adr);
        }
        else {
          var a_adr = this.getAddress(pc, a);
          var b_adr = this.getAddress(pc, b);
          var instruction = this.field[a_adr];

          this.field[b_adr] = Object.create(instruction);

          this.field[b_adr].setLastUser(this.warriors[this.currentWarrior]);
          this.field[a_adr].setLastAction("read");
          this.field[b_adr].setLastAction("write");

          touched.push(pc);
          touched.push(a_adr);
          touched.push(b_adr);
        }
      }; break;

      /**
       * Use and write A-numbers
       *
       * + a & b are immediate: do nothing
       * + a is immediate: move A-number to A-number of B address
       * + else: move A-number of A address to A-number of B address
       */
      case "a": {
        if(this.isImmediate(a) && this.isImmediate(b)) {
          touched.push(pc);
        }
        else if(this.isImmediate(a)) {
          var value = a.getValue();
          var b_adr = this.getAddress(pc, b);

          this.field[b_adr].getInstruction().getA().setValue(value);

          this.field[b_adr].setLastUser(this.warriors[this.currentWarrior]);
          this.field[b_adr].setLastAction("write");

          touched.push(pc);
          touched.push(b_adr);
        }
        else {
          var a_adr = this.getAddress(pc, a);
          var b_adr = this.getAddress(pc, b);
          var value = this.field[a_adr].getInstruction().getA().getValue();

          this.field[b_adr].getInstruction().getA().setValue(value);

          this.field[b_adr].setLastUser(this.warriors[this.currentWarrior]);
          this.field[a_adr].setLastAction("read");
          this.field[b_adr].setLastAction("write");

          touched.push(pc);

          touched.push(a_adr);
          touched.push(b_adr);
        }
      }; break;

      /**
       * Use and write B-numbers
       *
       * + a & b are immediate: do nothing
       * + a is immediate: move B-number to B-number of B address
       * + else: move B-number of A address to B-number of B address
       */
      case "b": {
        if(this.isImmediate(a) && this.isImmediate(b)) {
          touched.push(pc);
        }
        else if(this.isImmediate(a)) {
          var value = b.getValue();
          var b_adr = this.getAddress(pc, b);

          this.field[b_adr].getInstruction().getB().setValue(value);

          this.field[b_adr].setLastUser(this.warriors[this.currentWarrior]);
          this.field[b_adr].setLastAction("write");

          touched.push(pc);
          touched.push(b_adr);
        }
        else {
          var a_adr = this.getAddress(pc, a);
          var b_adr = this.getAddress(pc, b);
          var value = this.field[a_adr].getInstruction().getB().getValue();

          this.field[b_adr].getInstruction().getB().setValue(value);

          this.field[b_adr].setLastUser(this.warriors[this.currentWarrior]);
          this.field[a_adr].setLastAction("read");
          this.field[b_adr].setLastAction("write");

          touched.push(pc);

          touched.push(a_adr);
          touched.push(b_adr);
        }
      }; break;

      /**
       * Use the A-numbers of the A-instructions and the B-numbers of the
       * B-instructions and write B-numbers.
       *
       * + a & b are immediate: move A-number to B-number
       * + a is immediate: move A-number to B-number of B address
       * + else: move A-number of A address to B-number of B address
      */
      case "ab": {
        if(this.isImmediate(a) && this.isImmediate(b)) {
          var value = a.getValue();

          b.setValue(value);

          touched.push(pc);
        }
        else if(this.isImmediate(a)) {
          var value = a.getValue();
          var b_adr = this.getAddress(pc, b);

          this.field[b_adr].getInstruction().getB().setValue(value);

          this.field[b_adr].setLastUser(this.warriors[this.currentWarrior]);
          this.field[b_adr].setLastAction("write");

          touched.push(pc);
          touched.push(b_adr);
        }
        else {
          var a_adr = this.getAddress(pc, a);
          var b_adr = this.getAddress(pc, b);
          var value = this.field[a_adr].getInstruction().getA().getValue();

          this.field[b_adr].getInstruction().getB().setValue(value);

          this.field[b_adr].setLastUser(this.warriors[this.currentWarrior]);
          this.field[a_adr].setLastAction("read");
          this.field[b_adr].setLastAction("write");

          touched.push(pc);

          touched.push(a_adr);
          touched.push(b_adr);
        }
      }; break;

      /**
       * Use the B-numbers of the A-instructions and the A-numbers of the
       * B-instructions and write A-numbers.
       *
       * + a & b are immediate: move B-number to A-number
       * + a or b is immediate: move B-number to A-number of B address
       * + else: move B-number of A address to A-number of B address
       */
      case "ba": {
        if(this.isImmediate(a) && this.isImmediate(b)) {
          var value = b.getValue();

          a.setValue(value);

          touched.push(pc);
        }
        else if((this.isImmediate(a) && !this.isImmediate(b)) || (!this.isImmediate(a) && this.isImmediate(b))) {
          var value = b.getValue();
          var b_adr = this.getAddress(pc, b);

          this.field[b_adr].getInstruction().getA().setValue(value);

          this.field[b_adr].setLastUser(this.warriors[this.currentWarrior]);
          this.field[b_adr].setLastAction("write");

          touched.push(pc);
          touched.push(b_adr);
        }
        else {
          var a_adr = this.getAddress(pc, a);
          var b_adr = this.getAddress(pc, b);
          var value = this.field[a_adr].getInstruction().getB().getValue();

          this.field[b_adr].getInstruction().getA().setValue(value);

          this.field[a_adr].setLastUser(this.warriors[this.currentWarrior]);
          this.field[b_adr].setLastAction("write");
          this.field[a_adr].setLastAction("read");

          touched.push(pc);
          touched.push(a_adr);
          touched.push(b_adr);
        }
      }; break;

      /**
       * Use both the A-numbers and the B-numbers, using and writing
       * A-to-A, B-to-B.
       *
       * + a & b are immediate: do nothing
       * + a is immediate: move A-number to A-number of B address
       *                   move B-number to B-number of B address
       * + b is immediate: move A-number of A address to A-number
       *                   move B-number of A address to B-number
       * + else: move A-number of A address to A-number of B address
       *         move B-number of A address to B-number of B address
       */
      case "f": {
        if(this.isImmediate(a) && this.isImmediate(b)) {
          touched.push(pc);
        }
        else if(this.isImmediate(a) && !this.isImmediate(b)) {
          var a_value = a.getValue();
          var b_value = b.getValue();
          var b_adr = this.getAddress(pc, b);

          this.field[b_adr].getInstruction().getA().setValue(a_value);
          this.field[b_adr].getInstruction().getB().setValue(b_value);

          this.field[b_adr].setLastUser(this.warriors[this.currentWarrior]);
          this.field[b_adr].setLastAction("write");

          touched.push(pc);
          touched.push(b_adr);
        }
        else if(!this.isImmediate(a) && this.isImmediate(b)) {
          var a_adr = this.getAddress(pc, a);
          var a_value = this.field[a_adr].getInstruction().getA().getValue();
          var b_value = this.field[a_adr].getInstruction().getB().getValue();

          this.field[pc].getInstruction().getA().setValue(a_value);
          this.field[pc].getInstruction().getB().setValue(b_value);

          this.field[a_adr].setLastAction("read");

          touched.push(pc);
          touched.push(a_adr);
        }
        else {
          var a_adr = this.getAddress(pc, a);
          var b_adr = this.getAddress(pc, b);
          var a_value = this.field[a_adr].getInstruction().getA().getValue();
          var b_value = this.field[a_adr].getInstruction().getB().getValue();

          this.field[b_adr].getInstruction().getA().setValue(a_value);
          this.field[b_adr].getInstruction().getB().setValue(b_value);

          this.field[a_adr].setLastAction("read");
          this.field[b_adr].setLastAction("write");

          touched.push(pc);
          touched.push(a_adr);
          touched.push(b_adr);
        }
      }; break;

      /**
       * Use both the A-numbers and the B-numbers, using and writing
       * A-to-B, B-to-A
       *
       * + a & b are immediate: swap A-number with B-number
       * + a is immediate: move A-number to B-number of B address
       *                   move B-number to A-number of B address
       * + b is immediate: move A-number of A Address to B-number
       *                   move B-number of A Address to A-number
       * + else: move A-number of A address to B-number of B address
       *         move B-number of A address to A-number of B address
       */
      case "x": {
        if(this.isImmediate(a) && this.isImmediate(b)) {
          var temp = a.getValue();
          a.setValue(b.getValue());
          b.setValue(temp);

          touched.push(pc);
        }
        else if(this.isImmediate(a) && !this.isImmediate(b)) {
          var a_value = a.getValue();
          var b_value = b.getValue();
          var b_adr = this.getAddress(pc, b);

          this.field[b_adr].getInstruction().getB().setValue(a_value);
          this.field[b_adr].getInstruction().getA().setValue(b_value);

          this.field[b_adr].setLastUser(this.warriors[this.currentWarrior]);
          this.field[b_adr].setLastAction("write");

          touched.push(pc);
          touched.push(b_adr);
        }
        else if(!this.isImmediate(a) && this.isImmediate(b)) {
          var a_adr = this.getAddress(pc, a);
          var a_value = this.field[a_adr].getInstruction().getA().getValue();
          var b_value = this.field[a_adr].getInstruction().getB().getValue();

          this.field[pc].getInstruction().getB().setValue(a_value);
          this.field[pc].getInstruction().getA().setValue(b_value);

          this.field[a_adr].setLastAction("read");

          touched.push(pc);
          touched.push(a_adr);
        }
        else {
          var a_adr = this.getAddress(pc, a);
          var b_adr = this.getAddress(pc, b);
          var a_value = this.field[a_adr].getInstruction().getA().getValue();
          var b_value = this.field[a_adr].getInstruction().getB().getValue();

          this.field[b_adr].getInstruction().getB().setValue(a_value);
          this.field[b_adr].getInstruction().getA().setValue(b_value);

          this.field[a_adr].setLastAction("read");
          this.field[b_adr].setLastAction("write");

          touched.push(pc);
          touched.push(a_adr);
          touched.push(b_adr);
        }
      }; break;

      // Unknown modifier
      default: {
        console.log("MOV - unknown modifier:", modifier);
      }
    }

    if(this.updateCallback) this.updateCallback(touched);
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
        var a_value = this.field[a_adr].getInstruction().getA().getValue();
        a_value += this.field[b_adr].getInstruction().getA().getValue();
        a_value = this.sanitizeAddress(a_value);

        var b_value = this.field[a_adr].getInstruction().getB().getValue();
        b_value += this.field[b_adr].getInstruction().getB().getValue();
        b_value = this.sanitizeAddress(b_value);

        this.field[b_adr].getInstruction().getA().setValue(a_value);
        this.field[b_adr].getInstruction().getB().setValue(b_value);
      }; break;

      /**
       * add A-number of A address to A-number of B address
       */
      case "a": {
        var a_value = this.field[a_adr].getInstruction().getA().getValue();
        a_value += this.field[b_adr].getInstruction().getA().getValue();
        a_value = this.sanitizeAddress(a_value);

        this.field[b_adr].getInstruction().getA().setValue(a_value);
      }; break;

      /**
       * add B-number of A address to B-number of B address
       */
      case "b": {
        var b_value = this.field[a_adr].getInstruction().getB().getValue();
        b_value += this.field[b_adr].getInstruction().getB().getValue();
        b_value = this.sanitizeAddress(b_value);

        this.field[b_adr].getInstruction().getB().setValue(b_value);
      }; break;

      /**
       * add A-number of A address to B-number of B address
       */
      case "ab": {
        var a_value = this.field[a_adr].getInstruction().getA().getValue();
        a_value += this.field[b_adr].getInstruction().getB().getValue();
        a_value = this.sanitizeAddress(a_value);

        this.field[b_adr].getInstruction().getB().setValue(a_value);
      }; break;

      /**
       * add B-number of A address to A-number of B address
       */
      case "ba": {
        var b_value = this.field[a_adr].getInstruction().getB().getValue();
        b_value += this.field[b_adr].getInstruction().getA().getValue();
        b_value = this.sanitizeAddress(b_value);

        this.field[b_adr].getInstruction().getA().setValue(b_value);
      }; break;

      /**
       * add A-number of A address to B-number of B address
       * add B-number of A address to A-number of B address
       */
      case "x": {
        var a_value = this.field[a_adr].getInstruction().getA().getValue();
        a_value += this.field[b_adr].getInstruction().getB().getValue();
        a_value = this.sanitizeAddress(a_value);

        var b_value = this.field[a_adr].getInstruction().getB().getValue();
        b_value += this.field[b_adr].getInstruction().getA().getValue();
        b_value = this.sanitizeAddress(b_value);

        this.field[b_adr].getInstruction().getB().setValue(a_value);
        this.field[b_adr].getInstruction().getA().setValue(b_value);
      }; break;

      // Unknown modifier
      default: {
        console.log("ADD - unknown modifier:", modifier);
      }
    }

    if(this.updateCallback) {
      this.field[b_adr].setLastUser(this.warriors[this.currentWarrior]);
      this.field[a_adr].setLastAction("read");
      this.field[b_adr].setLastAction("write");

      touched.push(pc);
      touched.push(a_adr);
      touched.push(b_adr);

      this.updateCallback(touched);
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
        var a_value = this.field[b_adr].getInstruction().getA().getValue();
        a_value -= this.field[a_adr].getInstruction().getA().getValue();
        a_value = this.sanitizeAddress(a_value);

        var b_value = this.field[b_adr].getInstruction().getB().getValue();
        b_value -= this.field[a_adr].getInstruction().getB().getValue();
        b_value = this.sanitizeAddress(b_value);

        this.field[b_adr].getInstruction().getA().setValue(a_value);
        this.field[b_adr].getInstruction().getB().setValue(b_value);
      }; break;

      /**
       * subtract A-number of A address from A-number of B address
       */
      case "a": {
        var a_value = this.field[b_adr].getInstruction().getA().getValue();
        a_value -= this.field[a_adr].getInstruction().getA().getValue();
        a_value = this.sanitizeAddress(a_value);

        this.field[b_adr].getInstruction().getA().setValue(a_value);
      }; break;

      /**
       * subtract B-number of A address from B-number of B address
       */
      case "b": {
        var b_value = this.field[b_adr].getInstruction().getB().getValue();
        b_value -= this.field[a_adr].getInstruction().getB().getValue();
        b_value = this.sanitizeAddress(b_value);

        this.field[b_adr].getInstruction().getB().setValue(b_value);
      }; break;

      /**
       * subtract A-number of A address from B-number of B address
       */
      case "ab": {
        var a_value = this.field[b_adr].getInstruction().getB().getValue();
        a_value -= this.field[a_adr].getInstruction().getA().getValue();
        a_value = this.sanitizeAddress(a_value);

        this.field[b_adr].getInstruction().getB().setValue(a_value);
      }; break;

      /**
       * subtract B-number of A address from A-number of B address
       */
      case "ba": {
        var b_value = this.field[b_adr].getInstruction().getA().getValue();
        b_value -= this.field[a_adr].getInstruction().getB().getValue();
        b_value = this.sanitizeAddress(b_value);

        this.field[b_adr].getInstruction().getA().setValue(b_value);
      }; break;

      /**
       * subtract A-number of A address from B-number of B address
       * subtract B-number of A address from A-number of B address
       */
      case "x": {
        var a_value = this.field[b_adr].getInstruction().getB().getValue();
        a_value -= this.field[a_adr].getInstruction().getA().getValue();
        a_value = this.sanitizeAddress(a_value);

        var b_value = this.field[b_adr].getInstruction().getA().getValue();
        b_value -= this.field[a_adr].getInstruction().getB().getValue();
        b_value = this.sanitizeAddress(b_value);

        this.field[b_adr].getInstruction().getB().setValue(a_value);
        this.field[b_adr].getInstruction().getA().setValue(b_value);
      }; break;

      // Unknown modifier
      default: {
        console.log("SUB - unknown modifier:", modifier);
      }
    }

    if(this.updateCallback) {
      this.field[b_adr].setLastUser(this.warriors[this.currentWarrior]);
      this.field[a_adr].setLastAction("read");
      this.field[b_adr].setLastAction("write");

      touched.push(pc);
      touched.push(a_adr);
      touched.push(b_adr);

      this.updateCallback(touched);
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
        var a_value = this.field[b_adr].getInstruction().getA().getValue();
        a_value *= this.field[a_adr].getInstruction().getA().getValue();
        a_value = this.sanitizeAddress(a_value);

        var b_value = this.field[b_adr].getInstruction().getB().getValue();
        b_value *= this.field[a_adr].getInstruction().getB().getValue();
        b_value = this.sanitizeAddress(b_value);

        this.field[b_adr].getInstruction().getA().setValue(a_value);
        this.field[b_adr].getInstruction().getB().setValue(b_value);
      }; break;

      /**
       * multiply A-number of A address with A-number of B address
       */
      case "a": {
        var a_value = this.field[b_adr].getInstruction().getA().getValue();
        a_value *= this.field[a_adr].getInstruction().getA().getValue();
        a_value = this.sanitizeAddress(a_value);

        this.field[b_adr].getInstruction().getA().setValue(a_value);
      }; break;

      /**
       * multiply B-number of A address with B-number of B address
       */
      case "b": {
        var b_value = this.field[b_adr].getInstruction().getB().getValue();
        b_value *= this.field[a_adr].getInstruction().getB().getValue();
        b_value = this.sanitizeAddress(b_value);

        this.field[b_adr].getInstruction().getB().setValue(b_value);
      }; break;

      /**
       * multiply A-number of A address with B-number of B address
       */
      case "ab": {
        var a_value = this.field[b_adr].getInstruction().getB().getValue();
        a_value *= this.field[a_adr].getInstruction().getA().getValue();
        a_value = this.sanitizeAddress(a_value);

        this.field[b_adr].getInstruction().getB().setValue(a_value);
      }; break;

      /**
       * multiply B-number of A address with A-number of B address
       */
      case "ba": {
        var b_value = this.field[b_adr].getInstruction().getA().getValue();
        b_value *= this.field[a_adr].getInstruction().getB().getValue();
        b_value = this.sanitizeAddress(b_value);

        this.field[b_adr].getInstruction().getA().setValue(b_value);
      }; break;

      /**
       * multiply A-number of A address with B-number of B address
       * multiply B-number of A address with A-number of B address
       */
      case "x": {
        var a_value = this.field[b_adr].getInstruction().getB().getValue();
        a_value *= this.field[a_adr].getInstruction().getA().getValue();
        a_value = this.sanitizeAddress(a_value);

        var b_value = this.field[b_adr].getInstruction().getA().getValue();
        b_value *= this.field[a_adr].getInstruction().getB().getValue();
        b_value = this.sanitizeAddress(b_value);

        this.field[b_adr].getInstruction().getB().setValue(a_value);
        this.field[b_adr].getInstruction().getA().setValue(b_value);
      }; break;

      // Unknown modifier
      default: {
        console.log("MUL - unknown modifier:", modifier);
      }
    }

    if(this.updateCallback) {
      this.field[b_adr].setLastUser(this.warriors[this.currentWarrior]);
      this.field[a_adr].setLastAction("read");
      this.field[b_adr].setLastAction("write");

      touched.push(pc);
      touched.push(a_adr);
      touched.push(b_adr);

      this.updateCallback(touched);
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
        var a_value = this.field[b_adr].getInstruction().getA().getValue();
        a_value /= this.field[a_adr].getInstruction().getA().getValue();
        a_value = this.sanitizeAddress(a_value);

        var b_value = this.field[b_adr].getInstruction().getB().getValue();
        b_value /= this.field[a_adr].getInstruction().getB().getValue();
        b_value = this.sanitizeAddress(b_value);

        if(isNaN(a_value) || isNaN(b_value)) {
          throw "Division by 0";
          return;
        }

        this.field[b_adr].getInstruction().getA().setValue(a_value);
        this.field[b_adr].getInstruction().getB().setValue(b_value);
      }; break;

      /**
       * divide A-number of B address by A-number of A address
       */
      case "a": {
        var a_value = this.field[b_adr].getInstruction().getA().getValue();
        a_value /= this.field[a_adr].getInstruction().getA().getValue();
        a_value = this.sanitizeAddress(a_value);

        if(isNaN(a_value)) {
          throw "Division by 0";
          return;
        }

        this.field[b_adr].getInstruction().getA().setValue(a_value);
      }; break;

      /**
       * divide B-number of B address by B-number of A address
       */
      case "b": {
        var b_value = this.field[b_adr].getInstruction().getB().getValue();
        b_value /= this.field[a_adr].getInstruction().getB().getValue();
        b_value = this.sanitizeAddress(b_value);

        if(isNaN(b_value)) {
          throw "Division by 0";
          return;
        }

        this.field[b_adr].getInstruction().getB().setValue(b_value);
      }; break;

      /**
       * divide B-number of B address by A-number of A address
       */
      case "ab": {
        var a_value = this.field[b_adr].getInstruction().getB().getValue();
        a_value /= this.field[a_adr].getInstruction().getA().getValue();
        a_value = this.sanitizeAddress(a_value);

        if(isNaN(a_value)) {
          throw "Division by 0";
          return;
        }

        this.field[b_adr].getInstruction().getB().setValue(a_value);
      }; break;

      /**
       * divide A-number of B address by B-number of A address
       */
      case "ba": {
        var b_value = this.field[b_adr].getInstruction().getA().getValue();
        b_value /= this.field[a_adr].getInstruction().getB().getValue();
        b_value = this.sanitizeAddress(b_value);

        if(isNaN(b_value)) {
          throw "Division by 0";
          return;
        }

        this.field[b_adr].getInstruction().getA().setValue(b_value);
      }; break;

      /**
       * divide B-number of B address by A-number of A address
       * divide A-number of B address by B-number of A address
       */
      case "x": {
        var a_value = this.field[b_adr].getInstruction().getB().getValue();
        a_value /= this.field[a_adr].getInstruction().getA().getValue();
        a_value = this.sanitizeAddress(a_value);

        var b_value = this.field[b_adr].getInstruction().getA().getValue();
        b_value /= this.field[a_adr].getInstruction().getB().getValue();
        b_value = this.sanitizeAddress(b_value);

        if(isNaN(a_value) || isNaN(b_value)) {
          throw "Division by 0";
          return;
        }

        this.field[b_adr].getInstruction().getB().setValue(a_value);
        this.field[b_adr].getInstruction().getA().setValue(b_value);
      }; break;

      // Unknown modifier
      default: {
        console.log("DIV - unknown modifier:", modifier);
      }
    }

    if(this.updateCallback) {
      this.field[b_adr].setLastUser(this.warriors[this.currentWarrior]);
      this.field[a_adr].setLastAction("read");
      this.field[b_adr].setLastAction("write");

      touched.push(pc);
      touched.push(a_adr);
      touched.push(b_adr);

      this.updateCallback(touched);
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
      this.field[b_adr].setLastUser(this.warriors[this.currentWarrior]);
      this.field[a_adr].setLastAction("read");
      this.field[b_adr].setLastAction("write");

      touched.push(pc);
      touched.push(a_adr);
      touched.push(b_adr);

      this.updateCallback(touched);
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
        this.warriors[this.currentWarrior].setPC(a_adr);
      }; break;

      default: {
        console.log("JMP - unknown modifier:", modifier);
      }
    }

    if(this.updateCallback) {
      touched.push(pc);
      touched.push(a_adr);
      touched.push(b_adr);

      this.updateCallback(touched);
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

        this.warriors[this.currentWarrior].setPC(address);
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

        this.warriors[this.currentWarrior].setPC(address);
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

        this.warriors[this.currentWarrior].setPC(address);
      }; break;

      default: {
        console.log("JMZ - unknown modifier:", modifier);
      }
    }

    if(this.updateCallback) {
      this.field[a_adr].setLastAction("read");

      touched.push(pc);
      touched.push(a_adr);
      touched.push(b_adr);

      this.updateCallback(touched);
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

        this.warriors[this.currentWarrior].setPC(address);
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

        this.warriors[this.currentWarrior].setPC(address);
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

        this.warriors[this.currentWarrior].setPC(address);
      }; break;

      default: {
        console.log("JMN - unknown modifier:", modifier);
      }
    }

    if(this.updateCallback) {
      this.field[a_adr].setLastAction("read");

      touched.push(pc);
      touched.push(a_adr);
      touched.push(b_adr);

      this.updateCallback(touched);
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

        this.warriors[this.currentWarrior].setPC(address);
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

        this.warriors[this.currentWarrior].setPC(address);
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

        this.warriors[this.currentWarrior].setPC(address);
      }; break;

      default: {
        console.log("DJN - unknown modifier:", modifier);
      }
    }

    if(this.updateCallback) {
      this.field[a_adr].setLastAction("read");

      touched.push(pc);
      touched.push(a_adr);
      touched.push(b_adr);

      this.updateCallback(touched);
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

        this.warriors[this.currentWarrior].setPC(address);
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

        this.warriors[this.currentWarrior].setPC(address);
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

        this.warriors[this.currentWarrior].setPC(address);
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

        this.warriors[this.currentWarrior].setPC(address);
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

        this.warriors[this.currentWarrior].setPC(address);
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

        this.warriors[this.currentWarrior].setPC(address);
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

        this.warriors[this.currentWarrior].setPC(address);
      }; break;

      // Unknown modifier
      default: {
        console.log("CMP - unknown modifier:", modifier);
      }
    }

    if(this.updateCallback) {
      this.field[a_adr].setLastAction("read");
      this.field[b_adr].setLastAction("read");

      touched.push(pc);
      touched.push(a_adr);
      touched.push(b_adr);

      this.updateCallback(touched);
    }
  };

  this.slt = function(pc, modifier, a, b) {

  };

  this.spl = function(pc, modifier, a, b) {

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
Field.prototype.addWarrior = function(warrior, color) {
  var warrior = warrior;
  if(color) {
    warrior.setColor(color);
  }

  this.warriors.push(warrior)

  // TODO: the first warrior may be placed at absolute 0, all others need some
  //       padding to the first but should be placed
  var position = (this.coreSize / this.warriors.length) % 8000;
  warrior.setPC(position);
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
 * Triggers the start of the simulation and executes the first move.
 */
Field.prototype.start = function(updateCallback) {
  this.updateCallback = updateCallback;
  this.move();
};

/**
 * Execute the operation of the currently active warrior
 */
Field.prototype.move = function() {
  var warrior = this.warriors[this.currentWarrior];
  var pc = this.sanitizeAddress(warrior.getPC());

  console.log('Execute instructin at', pc);
  this.executeInstruction(pc);

  this.currentWarrior = (this.currentWarrior + 1) % this.warriors.length;
};
