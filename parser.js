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
      }; break;

      case 'nop':
      case 'spl':
      case 'jmp': {
        if (this.a && this.b) {
          return;
        }
        else {
          this.b = new Parameter('$', '0');
        }
      }; break;

      case 'dat': {
        if (this.a && this.b) {
          return;
        }
        else {
          tmp = this.a;
          this.b = tmp;
          this.a = new Parameter('#', '0');
        }
      }; break;
    };
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
      }; break;
      default: {
        return (a);
      }
    };
  };

  this.getModifier = function(opcode, a, b) {
    switch(opcode.toLowerCase()) {
      case 'dat':
      case 'nop': {
        return 'f';
      }; break;

      case 'jmp':
      case 'jmz':
      case 'jmn':
      case 'djn':
      case 'spl': {
        return 'b';
      }; break;

      case 'slt':
      case 'ldp':
      case 'stp': {
        if(a.mode == '#') {
          return 'ab';
        }
        return 'b';
      }; break;

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
      }; break;

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
      }; break;
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
    else if(params.length == 1 && params[0] != '') {
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
  }

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

      if(line != '') {
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

      if(line.indexOf('org') == 0) {
        var value = line.split(' ')[1];
        if(isNaN(value)) {
          this.startAlias = value;
        }
        else {
          this.start = value;
        }

        continue;
      }
      else if(line.indexOf('end') == 0) {
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
      else if(line.indexOf(';') == 0) {
        if(index = line.indexOf('author') > -1) {
          this.author = line.substring(index + 7).trim();
        }

        if(index = line.indexOf('name') > -1) {
          this.name = line.substring(index + 5).trim();
        }

        continue;
      }
      else if((index = line.indexOf(';')) > -1) {
        line = line.substring(0, index).trim();
      }

      if(line != '') {
        cleaned.push(line);
      }
    }

    return cleaned;
  }

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
  }

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
      if(index = this.opcodes.indexOf(word) < 0) {
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
  }

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

      if(text.length == 0){
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
              if(forCount == 0) {
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

            for(var i = 0; i < repeat; i++) {
              var current = block.slice();

              // We may need to replace index variables
              if(index != 0) {
                var label = text[forLine].split('for')[0].trim();
                for(var j = 0; j < current.length; j++) {
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
    var expression = expression;
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
    result = result % this.coreSize
    if(result > this.coreSize/2) {
      result = result - this.coreSize;
    }

    return Math.floor(result);
  }

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
  }

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
  }

  /**
   * Check opcodes and throw an error if an invalid line was found
   */
  this.buildProgram = function(text) {
    var program = [];
    for(var i = 0; i < text.length; i++) {
      var line = text[i];
      if(line != '') {
        var instruction = this.parseLine(line);
        program.push(instruction);
      }
    }

    return program;
  }

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
}

module.exports = Parser;
