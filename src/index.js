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
      // TODO: display the next instruction to be executed
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
    $('.debug-info')
      .removeClass('hidden');

    field.start(updateField);
  });

  $('button.start-simulation').click(function(e) {
    e.preventDefault();

    field.start(updateField);
  });

  $('button.start-simulation-no-visuals').click(function(e) {
    e.preventDefault();

    field.start();
  });

  $('button.load-warrior').click(function(e) {
    e.preventDefault();
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

    var cells = field.getField();
    drawField(cells);

    $('.controls').removeClass('hidden');
  });
});