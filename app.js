(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

module.exports = Cell;

},{}],2:[function(require,module,exports){
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
    var a = instruction.getA();
    var b = instruction.getB();

    var modifier = instruction.getModifier();
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
      console.log("max cycles reached");
      return;
    }

    var pc = that.currentWarrior.shiftPC();
    pc = that.sanitizeAddress(pc);

    that.executeInstruction(pc);

    if(!that.currentWarrior.isAlive()) {
      that.warriorsLeft -= 1;
      console.log("Warrior died:", that.currentWarrior);
      return;
    }

    if(that.warriorsLeft === 0) {
      console.log("Single warrior died");
      return;
    }
    else if (that.warriorsLeft == 1 && that.warriors.length > 1) {
      console.log("Only one warrior is left, he is the winner");
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

},{"./cell":1,"./instruction":4,"./opcodes/add":5,"./opcodes/cmp":6,"./opcodes/div":7,"./opcodes/djn":8,"./opcodes/jmn":9,"./opcodes/jmp":10,"./opcodes/jmz":11,"./opcodes/mod":12,"./opcodes/mov":13,"./opcodes/mul":14,"./opcodes/slt":15,"./opcodes/spl":16,"./opcodes/sub":17,"./parameter":18}],3:[function(require,module,exports){
var Field = require('./field');
var Parser = require('./parser');

$(document).ready(function() {
  var field = new Field(8000, 20000);
  var colors = ['red', 'blue', 'green'];

  var debug = false;

  var updateField = function(touched, currentWarrior, callback) {
    var cells = field.getField();
    for(var i = 0; i < touched.length; i++) {
      var index = touched[i];
      var cell = cells[index];
      var action = cell.getLastAction();
      var color = 'grey';
      if(cell.getLastUser()) {
        color = cell.getLastUser().getColor();
      }
      var title = index + ': ' + cell.getInstruction().toString();
      $('.field .cell[index=' + index + ']')
        .attr('action', action)
        .attr('title', title)
        .css('background-color', color);
    }

    // Give the screen some time to update and execute the callback
    if(!debug) {
      setTimeout(function() {
        callback();
      }, 0);
    }
    // Wait for the user to press the next button
    else {
      var pc = currentWarrior.getQueue()[0];
      var instruction = cells[pc].getInstruction();

      $('.debug-info .next-instruction')
        .html(instruction.toString());

      pc = ("0000" + pc).slice(-4);
      $('.debug-info .pc')
        .html(pc);

      $('button.next').bind('click', function(e) {
        e.preventDefault();

        $('button.next').unbind('click');
        callback();
      });
    }
  };

  $('button.step-simulation').click(function(e) {
    e.preventDefault();

    debug = true;

    var pc = 1;
    var instruction = field.getField()[1].getInstruction();
    $('.debug-info .next-instruction')
      .html(instruction.toString());

    pc = ("0000" + pc).slice(-4);
    $('.debug-info .pc')
      .html(pc);

    $('button.start-simulation').hide();
    $('button.step-simulation').hide();

    $('button.next')
      .removeClass('hidden');
    $('button.continue')
      .removeClass('hidden');
    $('.debug-info')
      .removeClass('hidden');


    field.start(updateField);
  });

  $('button.pause').click(function(e) {
    e.preventDefault();

    debug = true;

    $('button.start-simulation').hide();
    $('button.step-simulation').hide();
    $('button.pause').hide();

    $('button.next').removeClass('hidden').show();
    $('button.continue').removeClass('hidden').show();
    $('.debug-info').removeClass('hidden').show();

  });

  $('button.continue').click(function(e) {
    e.preventDefault();

    debug = false;

    $('button.pause')
      .removeClass('hidden')
      .show();

    $('button.next').hide();
    $('button.continue').hide();
    $('.debug-info').hide();
    $('button.pause')
      .removeClass('hidden');

    $('button.next').click();
  });

  $('button.start-simulation').click(function(e) {
    e.preventDefault();

    $('button.pause')
      .removeClass('hidden');

    $('button.start-simulation').hide();
    $('button.step-simulation').hide();

    field.start(updateField);
  });

  $('button.start-simulation-no-visuals').click(function(e) {
    e.preventDefault();

    field.start();
  });

  $('button.load-warrior').click(function(e) {
    e.preventDefault();

    $('button.load-warrior').attr('disabled', true);

    var text = $('textarea.warrior').val().split('\n');
    var parser = new Parser(text);
    var warrior = parser.getWarrior();

    var count = $('.warriors .warrior').length + 1;
    var color = colors[count - 1];
    warrior.setColor(color);

    $('.warrior-template')
      .clone()
      .appendTo('.warriors')
      .removeClass('warrior-template')
      .removeClass('hidden')
      .addClass('warrior')
      .addClass('warrior-' + count);

    $('.warrior-' + count + ' .warrior-info').append().html('Program <strong>' + warrior.getName() + '</strong> (length ' + warrior.getLength() + ') by <strong>' + warrior.getAuthor() + '</strong>');

    for(var i = 0, code = warrior.getCode(); i < code.length; i++) {
      var current = code[i];
      var start = '';
      if(i == warrior.getStart()) {
        start = 'START';
      }
      $('.warrior-' + count + ' table tbody').append('<tr>' +
        '<td>' + start + '</td>' +
        '<td>' + current.getOpcode().toUpperCase() + '.' + current.getModifier().toUpperCase() + '</td>'+
        '<td>' + current.getA().getMode().toUpperCase() + '</td>' +
        '<td>' + current.getA().getValue() + '</td>' +
        '<td>' + current.getB().getMode().toUpperCase() + '</td>' +
        '<td>' + current.getB().getValue() + '</td></tr>');
    }

    var drawField = function(cells) {
      var container = '';
      for(var i = 0; i < cells.length; i++) {
        var cell = cells[i];
        var color = '';
        if((user = cell.getLastUser())) {
          color = user.getColor();
          color = 'style="background-color: ' + color + ';"';
        }
        var action = cell.getLastAction();
        var title = i + ': ' + cell.getInstruction().toString();
        var item = '<div index="' + i + '" ' + color + ' class="cell" action="' + action + '" title="' + title + '"></div>';
        container += item;
      }
      $('.field').html(container);
    };

    field.addWarrior(warrior);

    $('button.load-warrior').attr('disabled', false);

    var cells = field.getField();
    drawField(cells);

    $('.controls').removeClass('hidden');
  });
});
},{"./field":2,"./parser":19}],4:[function(require,module,exports){
var Instruction = function (opcode, modifier, A, B) {
  this.opcode = opcode;
  this.modifier = modifier;
  this.A = A;
  this.B = B;
};

Instruction.prototype.getOpcode = function () {
  return this.opcode;
};

Instruction.prototype.getModifier = function () {
  return this.modifier;
};

Instruction.prototype.getA = function () {
  return this.A;
};

Instruction.prototype.getB = function () {
  return this.B;
};

Instruction.prototype.clone = function() {
  var a = this.A.clone();
  var b = this.B.clone();
  var clone = new Instruction(this.opcode, this.modifier, a, b);

  return clone;
};

Instruction.prototype.toString = function () {
  var string = this.opcode + '.' + this.modifier + ' ' + this.A.getMode() + this.A.getValue() + ', ' + this.B.getMode() + this.B.getValue();
  return string.toUpperCase();
};

module.exports = Instruction;

},{}],5:[function(require,module,exports){
var add = function(that, pc, modifier, a_adr, b_adr) {
  switch(modifier) {
    /**
     * add A-number of A address to A-number of B address
     * add B-number of A address to B-number of B address
     */
    case "f":
    case "i": {
      var a_nr = that.getANumber(a_adr);
      a_nr += that.getANumber(b_adr);
      a_nr = that.sanitizeAddress(a_nr);

      var b_nr = that.getBNumber(a_adr);
      b_nr += that.getBNumber(b_adr);
      b_nr = that.sanitizeAddress(b_nr);

      that.setANumber(b_adr, a_nr);
      that.setBNumber(b_adr, b_nr);
    } break;

    /**
     * add A-number of A address to A-number of B address
     */
    case "a": {
      var a_nr = that.getANumber(a_adr);
      a_nr += that.getANumber(b_adr);
      a_nr = that.sanitizeAddress(a_nr);

      that.setANumber(b_adr, a_nr);
    } break;

    /**
     * add B-number of A address to B-number of B address
     */
    case "b": {
      var b_nr = that.getBNumber(a_adr);
      b_nr += that.getBNumber(b_adr);
      b_nr = that.sanitizeAddress(b_nr);

      that.setBNumber(b_adr, b_nr);
    } break;

    /**
     * add A-number of A address to B-number of B address
     */
    case "ab": {
      var a_nr = that.getANumber(a_adr);
      a_nr += that.getBNumber(b_adr);
      a_nr = that.sanitizeAddress(a_nr);

      that.setBNumber(b_adr, a_nr);
    } break;

    /**
     * add B-number of A address to A-number of B address
     */
    case "ba": {
      var b_nr = that.getBNumber(a_adr);
      b_nr += that.getANumber(b_adr);
      b_nr = that.sanitizeAddress(b_nr);

      that.setBNumber(b_adr, b_nr);
    } break;

    /**
     * add A-number of A address to B-number of B address
     * add B-number of A address to A-number of B address
     */
    case "x": {
      var a_nr = that.getANumber(a_adr);
      a_nr += that.getBNumber(b_adr);
      a_nr = that.sanitizeAddress(a_nr);

      var b_nr = that.getBNumber(a_adr);
      b_nr += that.getANumber(b_adr);
      b_nr = that.sanitizeAddress(b_nr);

      that.setANumber(b_adr, b_nr);
      that.setBNumber(b_adr, a_nr);
    } break;

    // Unknown modifier
    default: {
      console.log("ADD - unknown modifier:", modifier);
    }
  }

  if(that.updateCallback) {
    that.field[a_adr].setLastAction("read");
    that.field[b_adr].setLastAction("write");
    that.field[b_adr].setLastUser(that.currentWarrior);
  }
};

module.exports = add;

},{}],6:[function(require,module,exports){
var cmp = function(that, pc, modifier, a_adr, b_adr) {
  switch(modifier) {
    /**
     * A-number at A address == A-number at B address: queue pc + 2
     * else: queue pc + 1
     */
    case "a": {
      var address = pc + 1;
      var a_nr_a = that.getANumber(a_adr);
      var a_nr_b = that.getANumber(b_adr);

      if(a_nr_a == a_nr_b) {
        address = pc + 2;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    /**
     * B-number at A address == B-number at B address: queue pc + 2
     * else: queue pc + 1
     */
    case "b": {
      var address = pc + 1;
      var b_nr_a = that.getBNumber(a_adr);
      var b_nr_b = that.getBNumber(b_adr);

      if(b_nr_a == b_nr_b) {
        address = pc + 2;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    /**
     * A-number at A address == B-number at B address: queue pc + 2
     * else: queue pc + 1
     */
    case "ab": {
      var address = pc + 1;
      var a_nr_a = that.getANumber(a_adr);
      var b_nr_b = that.getBNumber(b_adr);

      if(a_nr_a == b_nr_b) {
        address = pc + 2;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    /**
     * B-number at A address == A-number at B address: queue pc + 2
     * else: queue pc + 1
     */
    case "ba": {
      var address = pc + 1;
      var b_nr_a = that.getBNumber(a_adr);
      var a_nr_b = that.getANumber(b_adr);

      if(b_nr_a == a_nr_b) {
        address = pc + 2;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    /**
     * A-number at A address == A-number at B address AND
     * B-number at A address == B-number at B address: queue pc + 2
     * else: queue pc + 1
     */
    case "f": {
      var address = pc + 1;

      var a_nr_a = that.getANumber(a_adr);
      var b_nr_a = that.getBNumber(a_adr);

      var a_nr_b = that.getANumber(b_adr);
      var b_nr_b = that.getBNumber(b_adr);

      if((a_nr_a == a_nr_b) && (b_nr_a == b_nr_b)) {
        address = pc + 2;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    /**
     * A-number at A address == B-number at B address AND
     * B-number at A address == A-number at B address: queue pc + 2
     * else: queue pc + 1
     */
    case "x": {
      var address = pc + 1;

      var a_nr_a = that.getANumber(a_adr);
      var b_nr_a = that.getBNumber(a_adr);

      var a_nr_b = that.getANumber(b_adr);
      var b_nr_b = that.getBNumber(b_adr);

      if((a_nr_a == b_nr_b) && (b_nr_a == a_nr_b)) {
        address = pc + 2;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    /**
     * Instruction at A address == Instruction at B address: queue pc + 2
     * else: queue pc + 1
     */
    case "i": {
      var address = pc + 1;
      var a = that.field[a_adr].getInstruction();
      var b = that.field[b_adr].getInstruction();

      if((a.getOpcode() == b.getOpcode()) &&
         (a.getModifier() == b.getModifier()) &&
         (a.getA().getMode() == b.getA().getMode()) &&
         (a.getA().getValue() == b.getA().getValue()) &&
         (a.getB().getMode() == b.getB().getMode()) &&
         (a.getB().getValue() == b.getB().getValue())
        ) {
        address = pc + 2;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    // Unknown modifier
    default: {
      console.log("CMP - unknown modifier:", modifier);
    }
  }

  if(that.updateCallback) {
    that.field[a_adr].setLastAction("read");
    that.field[b_adr].setLastAction("read");
  }
};

module.exports = cmp;

},{}],7:[function(require,module,exports){
var div = function(that, pc, modifier, a_adr, b_adr) {
  switch(modifier) {
    /**
     * divide A-number of B address by A-number of A address
     * divide B-number of B address by B-number of A address
     */
    case "f":
    case "i": {
      var a_nr = that.getANumber(b_adr);
      a_nr /= that.getANumber(a_adr);
      a_nr = that.sanitizeAddress(a_nr);

      var b_nr = that.getBNumber(b_adr);
      b_nr /= that.getBNumber(a_adr);
      b_nr = that.sanitizeAddress(b_nr);

      if(isNaN(a_nr) || isNaN(b_nr)) {
        throw "Division by 0";
      }

      that.setANumber(b_adr, a_nr);
      that.setBNumber(b_adr, b_nr);
    } break;

    /**
     * divide A-number of B address by A-number of A address
     */
    case "a": {
      var a_nr = that.getANumber(b_adr);
      a_nr /= that.getANumber(a_adr);
      a_nr = that.sanitizeAddress(a_nr);

      if(isNaN(a_nr)) {
        throw "Division by 0";
      }

      that.setANumber(b_adr, a_nr);
    } break;

    /**
     * divide B-number of B address by B-number of A address
     */
    case "b": {
      var b_nr = that.getBNumber(b_adr);
      b_nr /= that.getBNumber(a_adr);
      b_nr = that.sanitizeAddress(b_nr);

      if(isNaN(b_nr)) {
        throw "Division by 0";
      }

      that.setBNumber(b_adr, b_nr);
    } break;

    /**
     * divide B-number of B address by A-number of A address
     */
    case "ab": {
      var a_nr = that.getBNumber(b_adr);
      a_nr /= that.getANumber(a_adr);
      a_nr = that.sanitizeAddress(a_nr);

      if(isNaN(a_nr)) {
        throw "Division by 0";
      }

      that.setBNumber(b_adr, a_nr);
    } break;

    /**
     * divide A-number of B address by B-number of A address
     */
    case "ba": {
      var b_nr = that.getANumber(b_adr);
      b_nr /= that.getBNumber(a_adr);
      b_nr = that.sanitizeAddress(b_nr);

      if(isNaN(b_nr)) {
        throw "Division by 0";
      }

      that.setANumber(b_adr, b_nr);
    } break;

    /**
     * divide B-number of B address by A-number of A address
     * divide A-number of B address by B-number of A address
     */
    case "x": {
      var a_nr = that.getBNumber(b_adr);
      a_nr /= that.getANumber(a_adr);
      a_nr = that.sanitizeAddress(a_nr);

      var b_nr = that.getANumber(b_adr);
      b_nr /= that.getBNumber(a_adr);
      b_nr = that.sanitizeAddress(b_nr);

      if(isNaN(a_nr) || isNaN(b_nr)) {
        throw "Division by 0";
      }

      that.setBNumber(b_adr, a_nr);
      that.setANumber(b_adr, b_nr);
    } break;

    // Unknown modifier
    default: {
      console.log("DIV - unknown modifier:", modifier);
    }
  }

  if(that.updateCallback) {
    that.field[a_adr].setLastAction("read");
    that.field[b_adr].setLastAction("write");
    that.field[b_adr].setLastUser(that.currentWarrior);
  }
};

module.exports = div;

},{}],8:[function(require,module,exports){
var djn = function(that, pc, modifier, a_adr, b_adr) {
  switch(modifier) {
    /**
     * Decrement A-number at B address
     *
     * Queue A address if A-number of B address is NOT 0
     * else: Queue address of next instruction
     */
    case "a":
    case "ba": {
      var address = pc + 1;
      var a_nr = that.getANumber(a_adr);
      a_nr = that.sanitizeAddress(a_nr - 1);
      that.setANumber(b_adr, a_nr);

      if(a_nr !== 0) {
        address = a_adr;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    /**
     * Decrement B-number at B address
     *
     * Queue A address if B-number of B address is NOT 0
     * else: Queue address of next instruction
     */
    case "b":
    case "ab": {
      var address = pc + 1;

      // decrement B-number at B address
      var b_nr = that.getBNumber(b_adr);
      b_nr = that.sanitizeAddress(b_nr - 1);
      that.setBNumber(b_adr, b_nr);

      if(b_nr !== 0) {
        address = a_adr;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    /**
     * Decrement A-number at B address
     * Decrement B-number at B address
     *
     * Queue A address if A-number or B-number of B address are NOT 0
     * else: Queue address of next instruction
     */
    case "f":
    case "x":
    case "i": {
      var address = pc + 1;

      var a_nr = that.getANumber(b_adr);
      a_nr = that.sanitizeAddress(a_nr - 1);
      that.setANumber(b_adr, a_nr);

      var b_nr = that.getBNumber(b_adr);
      b_nr = that.sanitizeAddress(a_nr - 1);
      that.setBNumber(b_adr, b_nr);

      if((a_nr !== 0) || (b_nr !== 0)) {
        address = a_adr;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    default: {
      console.log("DJN - unknown modifier:", modifier);
    }
  }

  if(that.updateCallback) {
    that.field[a_adr].setLastAction("read");
  }
};

module.exports = djn;

},{}],9:[function(require,module,exports){
var jmn = function(that, pc, modifier, a_adr, b_adr) {
  switch(modifier) {
    /**
     * Queue A address if A-number of B address is NOT 0
     * else: Queue address of next instruction
     */
    case "a":
    case "ba": {
      var address = pc +1;
      var a_nr = that.getANumber(b_adr);
      if(a_nr !== 0) {
        address = a_adr;
      }

      that.currentWarrior.pushPC(address);
    } break;

    /**
     * Queue A address if B-number of B address is NOT 0
     * else: Queue address of next instruction
     */
    case "b":
    case "ab": {
      var address = pc + 1;
      var b_nr = that.getBNumber(b_adr);
      if(b_nr !== 0) {
        address = a_adr;
      }

      that.currentWarrior.pushPC(address);
    } break;

    /**
     * Queue A address if either A-number or B-number of B address is NOT 0
     * else: Queue address of next instruction
     */
    case "f":
    case "x":
    case "i": {
      var address = pc + 1;
      var a_nr = that.getANumber(b_adr);
      var b_nr = that.getBNumber(b_adr);
      if((a_nr !== 0) && (b_nr !== 0)) {
        address = a_adr;
      }

      that.currentWarrior.pushPC(address);
    } break;

    default: {
      console.log("JMN - unknown modifier:", modifier);
    }
  }

  if(that.updateCallback) {
    that.field[a_adr].setLastAction("read");
  }
};

module.exports = jmn;

},{}],10:[function(require,module,exports){
var jmp = function(that, pc, modifier, a_adr, b_adr) {
  switch(modifier) {
    case "a":
    case "b":
    case "ab":
    case "ba":
    case "x":
    case "f":
    case "i": {
      that.currentWarrior.pushPC(a_adr);
    } break;

    default: {
      console.log("JMP - unknown modifier:", modifier);
    }
  }

  if(that.updateCallback) {
    that.field[a_adr].setLastAction("read");
  }
};

module.exports = jmp;

},{}],11:[function(require,module,exports){
var jmz = function(that, pc, modifier, a_adr, b_adr) {
  switch(modifier) {
    /**
     * Queue A address if A-number of B address is 0
     * else: Queue address of next instruction
     */
    case "a":
    case "ba": {
      var address = pc +1;
      var a_nr = that.getANumber(b_adr);
      if(a_nr === 0) {
        address = a_adr;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    /**
     * Queue A address if B-number of B address is 0
     * else: Queue address of next instruction
     */
    case "b":
    case "ab": {
      var address = pc + 1;
      var b_nr = that.getBNumber(b_adr);
      if(b_nr === 0) {
        address = a_adr;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    /**
     * Queue A address if both, A-number and B-number of B address are 0
     * else: Queue address of next instruction
     */
    case "x":
    case "f":
    case "i": {
      var address = pc + 1;
      var a_nr = that.getANumber(b_adr);
      var b_nr = that.getBNumber(b_adr);
      if(a_nr === 0 && b_nr === 0) {
        address = a_adr;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    default: {
      console.log("JMZ - unknown modifier:", modifier);
    }
  }

  if(that.updateCallback) {
    that.field[a_adr].setLastAction("read");
  }
};

module.exports = jmz;

},{}],12:[function(require,module,exports){
var mod = function(that, pc, modifier, a_adr, b_adr) {
  switch(modifier) {
    /**
     * mod A-number of B address by A-number of A address
     * mod B-number of B address by B-number of A address
     */
    case "f":
    case "i": {
      var a_nr = that.getANumber(b_adr);
      a_nr %= that.getANumber(a_adr);
      a_nr = that.sanitizeAddress(a_nr);

      var b_nr = that.getBNumber(b_adr);
      b_nr %= that.getBNumber(a_adr);
      b_nr = that.sanitizeAddress(b_nr);

      that.setANumber(b_adr, a_nr);
      that.setBNumber(b_adr, b_nr);
    } break;

    /**
     * mod A-number of B address by A-number of A address
     */
    case "a": {
      var a_nr = that.getANumber(b_adr);
      a_nr %= that.getANumber(a_adr);
      a_nr = that.sanitizeAddress(a_nr);

      that.setANumber(b_adr, a_nr);
    } break;

    /**
     * mod B-number of B address by B-number of A address
     */
    case "b": {
      var b_nr = that.getBNumber(b_adr);
      b_nr %= that.getBNumber(a_adr);
      b_nr = that.sanitizeAddress(b_nr);

      that.setBNumber(b_adr, b_nr);
    } break;

    /**
     * mod B-number of B address by A-number of A address
     */
    case "ab": {
      var a_nr = that.getBNumber(b_adr);
      a_nr %= that.getANumber(a_adr);
      a_nr = that.sanitizeAddress(a_nr);

      that.setBNumber(b_adr, a_nr);
    } break;

    /**
     * mod A-number of B address by B-number of A address
     */
    case "ba": {
      var b_nr = that.getANumber(b_adr);
      b_nr %= that.getBNumber(a_adr);
      b_nr = that.sanitizeAddress(b_nr);

      that.setANumber(b_adr, b_nr);
    } break;

    /**
     * mod B-number of B address by A-number of A address
     * mod A-number of B address by B-number of A address
     */
    case "x": {
      var a_nr = that.getBNumber(b_adr);
      a_nr %= that.getANumber(a_adr);
      a_nr = that.sanitizeAddress(a_nr);

      var b_nr = that.getANumber(b_adr);
      b_nr %= that.getBNumber(a_adr);
      b_nr = that.sanitizeAddress(b_nr);

      that.setBNumber(b_adr, a_nr);
      that.setANumber(b_adr, b_nr);
    } break;

    default: {
      console.log("MOD - unknown modifier:", modifier);
    }
  }

  if(that.updateCallback) {
    that.field[a_adr].setLastAction("read");
    that.field[b_adr].setLastAction("write");
    that.field[b_adr].setLastUser(that.currentWarrior);
  }
};

module.exports = mod;

},{}],13:[function(require,module,exports){
var mov = function(that, pc, modifier, a_adr, b_adr) {
  switch(modifier) {
    /**
     * copy instruction from A address to instruction at B address
     */
    case "i": {
      var instruction = that.field[a_adr].getInstruction();
      var clone = instruction.clone();

      that.field[b_adr].setInstruction(clone);
    } break;

    /**
     * copy A-number of A address to A-number of B address
     */
    case "a": {
      var a_nr = that.getANumber(a_adr);

      that.setANumber(b_adr, a_nr);
    } break;

    /**
     * copy B-number of A address to B-number of B address
     */
    case "b": {
      var b_nr = that.getBNumber(a_adr);

      that.setBNumber(b_adr, b_nr);
    } break;

    /**
     * copy A-number of A address to B-number of B address
    */
    case "ab": {
      var a_nr = that.getANumber(a_adr);

      that.setBNumber(b_adr, a_nr);
    } break;

    /**
     * copy B-number of A address to A-number of B address
     */
    case "ba": {
      var b_nr = that.getBNumber(a_adr);

      that.setANumber(b_adr, b_nr);
    } break;

    /**
     * copy A-number of A address to A-number of B address
     * copy B-number of A address to B-number of B address
     */
    case "f": {
      var a_nr = that.getANumber(a_adr);
      var b_nr = that.getBNumber(a_adr);

      that.setANumber(b_adr, a_nr);
      that.setBNumber(b_adr, b_nr);
    } break;

    /**
     * copy A-number of A address to B-number of B address
     * copy B-number of A address to A-number of B address
     */
    case "x": {
        var a_nr = that.getANumber(a_adr);
        var b_nr = that.getBNumber(a_adr);

        that.setANumber(b_adr, b_nr);
        that.setBNumber(b_adr, a_nr);
    } break;

    // Unknown modifier
    default: {
      console.log("MOV - unknown modifier:", modifier);
    }
  }

  if(that.updateCallback) {
    that.field[a_adr].setLastAction("read");
    that.field[b_adr].setLastAction("write");
    that.field[b_adr].setLastUser(that.currentWarrior);
  }
};

module.exports = mov;

},{}],14:[function(require,module,exports){
var mul = function(that, pc, modifier, a_adr, b_adr) {
  switch(modifier) {
    /**
     * multiply A-number of A address with A-number of B address
     * multiply B-number of A address with B-number of B address
     */
    case "f":
    case "i": {
      var a_nr = that.getANumber(b_adr);
      a_nr *= that.getANumber(a_adr);
      a_nr = that.sanitizeAddress(a_nr);

      var b_nr = that.getBNumber(b_adr);
      b_nr *= that.getBNumber(a_adr);
      b_nr = that.sanitizeAddress(b_nr);

      that.setANumber(b_adr, a_nr);
      that.setBNumber(b_adr, b_nr);
    } break;

    /**
     * multiply A-number of A address with A-number of B address
     */
    case "a": {
      var a_nr = that.getANumber(b_adr);
      a_nr *= that.getANumber(a_adr);
      a_nr = that.sanitizeAddress(a_nr);

      that.setANumber(b_adr, a_nr);
    } break;

    /**
     * multiply B-number of A address with B-number of B address
     */
    case "b": {
      var b_nr = that.getBNumber(b_adr);
      b_nr *= that.getBNumber(a_adr);
      b_nr = that.sanitizeAddress(b_nr);

      that.setBNumber(b_adr, b_nr);
    } break;

    /**
     * multiply A-number of A address with B-number of B address
     */
    case "ab": {
      var a_nr = that.getBNumber(b_adr);
      a_nr *= that.getANumber(a_adr);
      a_nr = that.sanitizeAddress(a_nr);

      that.setBNumber(b_adr, a_nr);
    } break;

    /**
     * multiply B-number of A address with A-number of B address
     */
    case "ba": {
      var b_nr = that.getANumber(b_adr);
      b_nr *= that.getBNumber(a_adr);
      b_nr = that.sanitizeAddress(b_nr);

      that.setANumber(b_adr, b_nr);
    } break;

    /**
     * multiply A-number of A address with B-number of B address
     * multiply B-number of A address with A-number of B address
     */
    case "x": {
      var a_nr = that.getBNumber(b_adr);
      a_nr *= that.getANumber(a_adr);
      a_nr = that.sanitizeAddress(a_nr);

      var b_nr = that.getANumber(b_adr);
      b_nr *= that.getBNumber(a_adr);
      b_nr = that.sanitizeAddress(b_nr);

      that.setBNumber(b_adr, a_nr);
      that.setANumber(b_adr, b_nr);
    } break;

    // Unknown modifier
    default: {
      console.log("MUL - unknown modifier:", modifier);
    }
  }

  if(that.updateCallback) {
    that.field[a_adr].setLastAction("read");
    that.field[b_adr].setLastAction("write");
    that.field[b_adr].setLastUser(that.currentWarrior);
  }
};

module.exports = mul;

},{}],15:[function(require,module,exports){
var slt = function(that, pc, modifier, a_adr, b_adr) {
  switch(modifier) {
    /**
     * A-number at A address < A-number at B address: queue pc + 2
     * else: queue pc + 1
     */
    case "a": {
      var address = pc + 1;
      var a_nr_a = that.getANumber(a_adr);
      var a_nr_b = that.getANumber(b_adr);

      if(a_nr_a < a_nr_b) {
        address = pc + 2;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    /**
     * B-number at A address < B-number at B address: queue pc + 2
     * else: queue pc + 1
     */
    case "b": {
      var address = pc + 1;
      var b_nr_a = that.getBNumber(a_adr);
      var b_nr_b = that.getBNumber(b_adr);

      if(b_nr_a < b_nr_b) {
        address = pc + 2;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    /**
     * A-number at A address < B-number at B address: queue pc + 2
     * else: queue pc + 1
     */
    case "ab": {
      var address = pc + 1;
      var a_nr_a = that.getANumber(a_adr);
      var b_nr_b = that.getBNumber(b_adr);

      if(a_nr_a < b_nr_b) {
        address = pc + 2;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    /**
     * B-number at A address < A-number at B address: queue pc + 2
     * else: queue pc + 1
     */
    case "ba": {
      var address = pc + 1;
      var b_nr_a = that.getBNumber(a_adr);
      var a_nr_b = that.getANumber(b_adr);

      if(b_nr_a < a_nr_b) {
        address = pc + 2;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    /**
     * A-number at A address < A-number at B address AND
     * B-number at A address < B-number at B address: queue pc + 2
     * else: queue pc + 1
     */
    case "f":
    case "i": {
      var address = pc + 1;

      var a_nr_a = that.getANumber(a_adr);
      var b_nr_a = that.getBNumber(a_adr);

      var a_nr_b = that.getANumber(b_adr);
      var b_nr_b = that.getBNumber(b_adr);

      if((a_nr_a < a_nr_b) && (b_nr_a < b_nr_b)) {
        address = pc + 2;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    /**
     * A-number at A address < B-number at B address AND
     * B-number at A address < A-number at B address: queue pc + 2
     * else: queue pc + 1
     */
    case "x": {
      var address = pc + 1;

      var a_nr_a = that.getANumber(a_adr);
      var a_nr_b = that.getANumber(b_adr);

      var b_nr_a = that.getBNumber(a_adr);
      var b_nr_b = that.getBNumber(b_adr);

      if((a_nr_a < b_nr_b) && (b_nr_a < a_nr_b)) {
        address = pc + 2;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    // Unknown modifier
    default: {
      console.log("SLT - unknown modifier:", modifier);
    }
  }

  if(that.updateCallback) {
    that.field[a_adr].setLastAction("read");
    that.field[b_adr].setLastAction("read");
  }
};

module.exports = slt;

},{}],16:[function(require,module,exports){
var spl = function(that, pc, modifier, a_adr, b_adr) {
  switch(modifier) {
    case "a":
    case "b":
    case "ab":
    case "ba":
    case "x":
    case "f":
    case "i": {
      that.currentWarrior.pushPC(that.sanitizeAddress(pc + 1));
      that.currentWarrior.pushPC(that.sanitizeAddress(a_adr));
    } break;

    default: {
      console.log("SPL - unknown modifier:", modifier);
    }
  }
};

module.exports = spl;

},{}],17:[function(require,module,exports){
var sub = function(that, pc, modifier, a_adr, b_adr) {
  switch(modifier) {
    /**
     * subtract A-number of A address from A-number of B address
     * subtract B-number of A address from B-number of B address
     */
    case "f":
    case "i": {
      var a_nr = that.getANumber(b_adr);
      a_nr -= that.getANumber(a_adr);
      a_nr = that.sanitizeAddress(a_nr);

      var b_nr = that.getBNumber(b_adr);
      b_nr -= that.getBNumber(a_adr);
      b_nr = that.sanitizeAddress(b_nr);

      that.setANumber(b_adr, a_nr);
      that.setBNumber(b_adr, b_nr);
    } break;

    /**
     * subtract A-number of A address from A-number of B address
     */
    case "a": {
      var a_nr = that.getANumber(b_adr);
      a_nr -= that.getANumber(a_adr);
      a_nr = that.sanitizeAddress(a_nr);

      that.setANumber(b_adr, a_nr);
    } break;

    /**
     * subtract B-number of A address from B-number of B address
     */
    case "b": {
      var b_nr = that.getBNumber(b_adr);
      b_nr -= that.getBNumber(a_adr);
      b_nr = that.sanitizeAddress(b_nr);

      that.setBNumber(b_adr, b_nr);
    } break;

    /**
     * subtract A-number of A address from B-number of B address
     */
    case "ab": {
      var a_nr = that.getBNumber(b_adr);
      a_nr -= that.getANumber(a_adr);
      a_nr = that.sanitizeAddress(a_nr);

      that.setBNumber(b_adr, a_nr);
    } break;

    /**
     * subtract B-number of A address from A-number of B address
     */
    case "ba": {
      var b_nr = that.getANumber(b_adr);
      b_nr -= that.getBNumber(a_adr);
      b_nr = that.sanitizeAddress(b_nr);

      that.setANumber(b_adr, b_nr);
    } break;

    /**
     * subtract A-number of A address from B-number of B address
     * subtract B-number of A address from A-number of B address
     */
    case "x": {
      var a_nr = that.getBNumber(b_adr);
      a_nr -= that.getANumber(a_adr);
      a_nr = that.sanitizeAddress(a_nr);

      var b_nr = that.getANumber(b_adr);
      b_nr -= that.getBNumber(a_adr);
      b_nr = that.sanitizeAddress(b_nr);

      that.setBNumber(b_adr, a_nr);
      that.setANumber(b_adr, b_nr);
    } break;

    // Unknown modifier
    default: {
      console.log("SUB - unknown modifier:", modifier);
    }
  }

  if(that.updateCallback) {
    that.field[a_adr].setLastAction("read");
    that.field[b_adr].setLastAction("write");
    that.field[b_adr].setLastUser(that.currentWarrior);
  }
};

module.exports = sub;

},{}],18:[function(require,module,exports){
var Parameter = function (mode, value) {
  this.mode = mode;
  this.value = value;
};

Parameter.prototype.setValue = function(value) {
  this.value = value;
};

Parameter.prototype.getValue = function() {
  return parseInt(this.value);
};

Parameter.prototype.getMode = function() {
  return this.mode;
};

Parameter.prototype.clone = function() {
  var mode = this.mode;
  var value = this.value;
  var clone = new Parameter(mode, value);

  return clone;
};

module.exports = Parameter;

},{}],19:[function(require,module,exports){
var Warrior = require('./warrior');
var Instruction = require('./instruction');
var Parameter = require('./parameter');

var Parser = function (text) {
  this.opcodes = ['dat', 'mov', 'add', 'sub', 'mul', 'div', 'mod', 'jmp', 'jmz', 'jmn', 'djn', 'spl', 'cmp', 'seq', 'sne', 'slt', 'ldp', 'stp', 'nop'];
  this.modifiers = ['a', 'b', 'ab', 'ba', 'f', 'x', 'i'];
  this.modes = ['#', '$', '*', '@', '{', '<', '}', '>'];

  this.coreSize = 8000;

  this.labels = [];
  this.variables = [];

  this.program = [];
  this.lines = 0;
  this.author = 'unknown';
  this.name = 'unknown';

  this.start = 0;
  this.startAlias = null;

  this.opcode = null;
  this.a = null;
  this.b = null;

  this.setParameters = function(opcode) {
    switch(opcode) {
      case 'mov':
      case 'add':
      case 'sub':
      case 'mul':
      case 'div':
      case 'mod':
      case 'jmz':
      case 'jmn':
      case 'djn':
      case 'cmp':
      case 'seq':
      case 'sne':
      case 'slt':
      case 'ldp':
      case 'stp': {
        return;
      } break;

      case 'nop':
      case 'spl':
      case 'jmp': {
        if (this.a && this.b) {
          return;
        }
        else {
          this.b = new Parameter('$', '0');
        }
      } break;

      case 'dat': {
        if (this.a && this.b) {
          return;
        }
        else {
          tmp = this.a;
          this.b = tmp;
          this.a = new Parameter('#', '0');
        }
      } break;
    }
  };

  this.isValidParameters = function(opcode, a, b) {
    switch(opcode) {
      case 'mov':
      case 'add':
      case 'sub':
      case 'mul':
      case 'div':
      case 'mod':
      case 'jmz':
      case 'jmn':
      case 'djn':
      case 'cmp':
      case 'seq':
      case 'sne':
      case 'slt':
      case 'ldp':
      case 'stp': {
        return (a && b);
      } break;
      default: {
        return (a);
      }
    }
  };

  this.getModifier = function(opcode, a, b) {
    switch(opcode.toLowerCase()) {
      case 'dat':
      case 'nop': {
        return 'f';
      } break;

      case 'jmp':
      case 'jmz':
      case 'jmn':
      case 'djn':
      case 'spl': {
        return 'b';
      } break;

      case 'slt':
      case 'ldp':
      case 'stp': {
        if(a.mode == '#') {
          return 'ab';
        }
        return 'b';
      } break;

      case 'add':
      case 'sub':
      case 'mul':
      case 'div':
      case 'mod': {
        if(a.mode == '#') {
          return 'ab';
        }
        if(a.mode != '#' && b.mode == '#') {
          return 'b';
        }
        return 'f';
      } break;

      case 'mov':
      case 'seq':
      case 'sne':
      case 'cmp': {
        if(a.mode == '#') {
          return 'ab';
        }
        if(a.mode != '#' && b.mode == '#') {
          return 'b';
        }
        return 'i';
      } break;
    }
  };

  this.isValidOpcode = function(opcode) {
    return (this.opcodes.indexOf(opcode.toLowerCase()) > -1);
  };

  this.parseLine = function(line) {
    var instruction = null;
    var original = line;

    // Get the opcode and potential modifier
    var opcode = line.split(' ')[0];
    line = line.substring(opcode.length).trim();
    var modifier = null;
    if(opcode.indexOf('.') > -1) {
      modifier = opcode.split('.')[1];
      opcode = opcode.split('.')[0];
    }

    if(!this.isValidOpcode(opcode)) {
      throw 'Invalid opcode: ' + opcode + ' (' + line + ')';
    }

    var params = line.split(',');

    this.a = null;
    this.b = null;

    // Two parameters
    // If no mode is set, it is always direct $
    if(params.length == 2) {
      if(this.modes.indexOf(params[0][0]) > -1) {
        this.a = new Parameter(params[0][0], params[0].substring(1));
      }
      else {
        this.a = new Parameter('$', params[0]);
      }

      if(this.modes.indexOf(params[1][0]) > -1) {
        this.b = new Parameter(params[1][0], params[1].substring(1));
      }
      else {
        this.b = new Parameter('$', params[1]);
      }
    }
    // One parameter
    else if(params.length == 1 && params[0] !== '') {
      if(this.modes.indexOf(params[0][0]) > -1) {
        this.a = new Parameter(params[0][0], params[0].substring(1));
      }
      else {
        this.a = new Parameter('$', params[0]);
      }
    }

    // Check if the amount of parameters is valid
    if(!this.isValidParameters(opcode, this.a, this.b)) {
      throw 'Missing parameter(s): ' + original;
    }

    // Set the parameters
    this.setParameters(opcode);

    // Get the default modifier if none has been provided
    if(!modifier) {
      modifier = this.getModifier(opcode, this.a, this.b);
    }

    // Build the instruction
    instruction = new Instruction(opcode, modifier, this.a, this.b);


    return instruction;
  };

  /**
   * Trim whitespaces, replace multiple whitespaces, align comments, strip empty
   * lines
   *
   * Returns the sanitized code
   */
  this.sanitize = function(text) {
    var sanitized = [];
    for(var i = 0; i < text.length; i++) {
      var line = text[i];
      line = line
        .replace(/\s+/g, ' ')
        .replace(/;\s?/g, ';')
        .trim();

      if(line !== '') {
        sanitized.push(line);
      }
    }

    return sanitized;
  };

  /**
   * Parse the comments for author and name, strip them from the rest of the
   * code, set start if possible
   *
   * Returns code without comments
   */
  this.parseComments = function(text) {
    var cleaned = [];
    for(var i = 0; i < text.length; i++) {
      var line = text[i];

      if(line.indexOf('org') === 0) {
        var value = line.split(' ')[1];
        if(isNaN(value)) {
          this.startAlias = value;
        }
        else {
          this.start = value;
        }

        continue;
      }
      else if(line.indexOf('end') === 0) {
        if(line.split(' ').length > 1) {
          var value = line.split(' ')[1];
          if(isNaN(value)) {
            this.startAlias = value;
          }
          else {
            this.start = value;
          }
        }

        break;
      }
      else if(line.indexOf(';') === 0) {
        if((index = line.indexOf('author')) > -1) {
          this.author = line.substring(index + 7).trim();
        }

        if((index = line.indexOf('name')) > -1) {
          this.name = line.substring(index + 5).trim();
        }

        continue;
      }
      else if((index = line.indexOf(';')) > -1) {
        line = line.substring(0, index).trim();
      }

      if(line !== '') {
        cleaned.push(line);
      }
    }

    return cleaned;
  };

  /**
   * Parse all the variables, save them to an array, sort them by length
   * and strip them from code.
   *
   * Returns code without variables
   */
  this.parseVariables = function(text) {
    var noVars = [];
    for(var i = 0; i < text.length; i++) {
      var line = text[i];

      var res = line.match(/ equ /gi);
      if(res) {
        var name = line.split(' ')[0].trim();
        var value = line.split(' ')[2].trim();

        this.variables[name] = value;
      }
      else {
        noVars.push(line);
      }
    }

    // Sort variables by length
    var sorted = [];
    for(var key in this.variables) {
      sorted.push(key);
    }
    sorted.sort(function(a, b) {
      return b.length - a.length;
    });

    var tmp = [];
    for(var i = 0; i < sorted.length; i++) {
      tmp[sorted[i]] = this.variables[sorted[i]];
    }
    this.variables = tmp;

    return noVars;
  };

  /**
   * Replace all variables inside the variables and inside the code
   *
   * Returns code with replaced variable placeholders
   */
  this.replaceVariables = function(text) {
    for(var key in this.variables) {
      var value = this.variables[key];
      for(var current in this.variables) {
        var line = this.variables[current];
        line = line.split(key).join(value);
        this.variables[current] = line;
      }
    }

    var noVars = text;
    for(var j = 0; j < noVars.length; j++) {
      var line = noVars[j];
      for(var key in this.variables) {
        var value = this.variables[key];
        line = line.split(key).join(value);
      }
      noVars[j] = line;
    }

    return noVars;
  };

  /**
   * Get and replace all labels until first for is found. Expand the label array
   *
   * Returns code with replaced label until and including first found for
   */
  this.replaceLabels = function(text) {
    var stripped = text;
    var forFound = false;
    var forLine = -1;

    for(var i = 0; i < stripped.length; i++) {
      var line = stripped[i];
      if(line.indexOf('for') > -1) {
        forFound = true;
        forLine = i;
        break;
      }

      // Definetly a label
      if(line.indexOf(':') > -1) {
        var label = line.split(':')[0].trim();
        line = line.split(':')[1].trim();
        this.labels[label] = i;
        stripped[i] = line;

        continue;
      }

      // Check the first word for a label
      var word = line.split(' ')[0].trim();
      if(word.indexOf('.') > -1) {
        word = word.split('.')[0].trim();
      }
      word = word.toLowerCase();
      if((index = this.opcodes.indexOf(word)) < 0) {
        var label = line.split(' ')[0].trim();
        line = line.substring(index + label.length).trim();
        this.labels[label] = i;
        stripped[i] = line;

        continue;
      }
    }

    // And build index
    var labelKeys = [];
    for(var key in this.labels) {
      labelKeys.push(key);
    }
    labelKeys.sort(function(a, b) {
      return b.length - a.length;
    });

    var limit = stripped.length;
    if(forFound) {
      limit = forLine + 1;
    }
    // Replace all labels till first for
    for(var i = 0; i < limit; i++) {
      var line = stripped[i];
      for(var j = 0; j < labelKeys.length; j++) {
        var key = labelKeys[j];
        var value = this.labels[key];
        line = line.split(key).join(value - i);
        stripped[i] = line;
      }
    }

    return stripped;
  };

  /**
   * Expand the first for found in the code. After the first for is found, we
   * parse for the matching rof, if we find another for, we need to look for
   * another matching rof before we can copy the according block.
   *
   * After each time expanding a for we need to repace and gather new Labels.
   *
   * This is repeated until no more fors are found
   */
  this.expandFors = function(text) {
    var text = text;
    var expanded = false;

    while(!expanded) {
      var forLine = -1;
      var rofLine = -1;
      var forCount = 0;
      var rofFound = false;

      if(text.length === 0){
        expanded = true;
        continue;
      }

      for(var i = 0; i < text.length; i++) {
        if(i == (text.length - 1)) {
          expanded = true;
        }
        var line = text[i];

        // If a for is found, we search for the matching rof, or the next for
        if((index = line.indexOf('for ')) > -1) {
          forLine = i;
          forCount += 1;
          var j = i;
          while(!rofFound) {
            j += 1;
            line = text[j];
            // Found another for
            if(line.indexOf('for ') > -1) {
              forCount += 1;
              continue;
            }
            if(line.indexOf('rof') > -1) {
              forCount -= 1;
              if(forCount === 0) {
                rofLine = j;
                rofFound = true;
              }
            }
          }
          // Found the rof, build the sub array and append
          if(rofFound) {
            var index = text[forLine].indexOf('for');
            var repeat = text[forLine].substring(index + 3).trim();
            var block = text.slice(forLine + 1, rofLine);
            var blocks = [];

            if (isNaN(repeat)) {
              repeat = this.parseExpression(repeat, forLine);
            }

            for(i = 0; i < repeat; i++) {
              var current = block.slice();

              // We may need to replace index variables
              if(index !== 0) {
                var label = text[forLine].split('for')[0].trim();
                for(j = 0; j < current.length; j++) {
                  var replace = i + 1;
                  if(replace < 10) {
                    replace = '0' + replace;
                  }
                  current[j] = current[j].split(label).join(replace);
                }
              }
              blocks = blocks.concat(current);
            }

            // Remove for and rof range from noVars
            text.splice(forLine, rofLine-forLine+1);

            // Insert blocks at their position
            text.splice.apply(text, [forLine, 0].concat(blocks));

            text = this.replaceLabels(text);
            break;
          }
        }
      }
    }

    return text;
  };

  /**
   * Returns the numeric number of an expression
   */
  this.parseExpression = function(expression, line) {
    expression = expression.split('&').join('');

    // Replace all variables
    for(var key in this.variables) {
      var value = this.variables[key];
      expression = expression.split(key).join(value);
    }

    // Replase all labels
    var labelKeys = [];
    for(var key in this.labels) {
      labelKeys.push(key);
    }
    labelKeys.sort(function(a, b) {
      return b.length - a.length;
    });
    for(var j = 0; j < labelKeys.length; j++) {
      var key = labelKeys[j];
      var value = this.labels[key];
      expression = expression.split(key).join(value - line);
    }

    // Math sanitization
    expression = expression.split('--').join('+');

    var result = eval(expression);
    result = result % this.coreSize;
    if(result > this.coreSize/2) {
      result = result - this.coreSize;
    }

    return Math.floor(result);
  };

  /**
   * Evaluate all expressions
   *
   * Returns code with evaluated expressions
   */
  this.evaluateExpressions = function(text) {
    var evaluated = [];

    for(var i = 0; i < text.length; i++) {
      // There are three different cases:
      // * no argument
      // * one argument
      // * two arguments
      var line = text[i];
      if((index = line.indexOf(' ')) > -1) {
        var op = line.substring(0, index).trim();
        var parameters = line.substring(index).trim();
        // Two arguments
        if((index = parameters.indexOf(',')) > -1) {
          parameters = parameters.split(',');

          var mode_1 = '';
          var parameter_1 = parameters[0].trim();
          if(this.modes.indexOf(parameter_1[0]) > -1) {
            mode_1 = parameter_1[0];
            parameter_1 = parameter_1.substring(1);
          }

          var mode_2 = '';
          var parameter_2 = parameters[1].trim();
          if(this.modes.indexOf(parameter_2[0]) > -1) {
            mode_2 = parameter_2[0];
            parameter_2 = parameter_2.substring(1);
          }

          if(isNaN(parameter_1)) {
            parameter_1 = this.parseExpression(parameter_1);
          }

          if(isNaN(parameter_2)) {
            parameter_2 = this.parseExpression(parameter_2);
          }

          evaluated.push(op + ' ' + mode_1 + parameter_1 + ',' + mode_2 + parameter_2);
        }
        // One argument
        else {
          var mode = '';
          var parameter = parameters;
          if(this.modes.indexOf(parameters[0]) > -1) {
            mode = parameters[0];
            parameter = parameters.substring(1);
          }

          if(isNaN(parameter)) {
            parameter = this.parseExpression(parameter);
          }

          evaluated.push(op + ' ' + mode + parameter);
        }
      }
      // No parameter, nothing to do here
      else {
        evaluated.push(line);
      }
    }

    return evaluated;
  };

  /**
   * Lowercase all opcodes
   *
   * Returns code in all lower case
   */
  this.lowerCase = function(text) {
    var lowerCase = [];
    for(var i = 0; i < text.length; i++) {
      var line = text[i].toLowerCase();
      lowerCase.push(line);
    }

    return lowerCase;
  };

  /**
   * Check opcodes and throw an error if an invalid line was found
   */
  this.buildProgram = function(text) {
    var program = [];
    for(var i = 0; i < text.length; i++) {
      var line = text[i];
      if(line !== '') {
        var instruction = this.parseLine(line);
        program.push(instruction);
      }
    }

    return program;
  };

  text = this.sanitize(text);
  text = this.parseComments(text);
  text = this.parseVariables(text);
  text = this.replaceVariables(text);
  text = this.replaceLabels(text);
  text = this.expandFors(text);
  text = this.evaluateExpressions(text);
  text = this.lowerCase(text);
  this.program = this.buildProgram(text);

  if(this.labels[this.startAlias]) {
    this.start = this.labels[this.startAlias];
  }
};

Parser.prototype.getWarrior = function () {
  var warrior = new Warrior(this.program, this.start, this.author, this.name);

  return warrior;
};

module.exports = Parser;

},{"./instruction":4,"./parameter":18,"./warrior":20}],20:[function(require,module,exports){
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
};

/**
 * Return the first address of the PC queue
 */
Warrior.prototype.shiftPC = function() {
  var address = this.queue.shift();
  if(address !== undefined) {
    return address;
  }
  else {
    throw ("Requested address from a dead warrior");
  }
};

Warrior.prototype.getQueue = function() {
  return this.queue;
};

/**
 * Return true as long as the warrior has an address on the PC queue
 */
Warrior.prototype.isAlive = function() {
  return (this.queue.length > 0);
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

Warrior.prototype.setColor = function(color) {
  this.color = color;
};

Warrior.prototype.getColor = function() {
  return this.color;
};

module.exports = Warrior;

},{}]},{},[3]);
