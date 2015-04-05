var field = new Field(8000);

$('button.start-simulation').click(function(e) {
  e.preventDefault();

  var drawField = function(cells) {
    var container = "";
    for(var i = 0; i < cells.length; i++) {
      var cell = cells[i];
      var color = ''
      if(user = cell.getLastUser()) {
        color = user.getColor();
        color = 'style="background-color: ' + color + ';"';
      }
      var action = cell.getLastAction();
      var title = i + ': ' + cell.getInstruction().toString();
      var item = '<div index="' + i + '" ' + color + ' class="cell" action="' + action + '" title="' + title + '"></div>';
      container += item;
    }
    $('.row.field').html(container);
  };

  var fieldUpdate = function(touched) {
    var cells = field.getField();
    for(var i = 0; i < touched.length; i++) {
      var index = touched[i];
      var cell = cells[index];
      var action = cell.getLastAction();
      var color = 'grey';
      if(cell.getLastUser()) {
        color = cell.getLastUser().getColor();
      }
      var title = i + ': ' + cell.getInstruction().toString();
      $('.field .cell[index=' + index + ']')
        .attr('action', action)
        .attr('title', title)
        .css('background-color', color);
    };
    setTimeout(function() {
      field.move();
    }, 50);
  }

  var cells = field.getField();
  drawField(cells);

  field.start(fieldUpdate);
});

$('button.load-warrior').click(function(e) {
  e.preventDefault();
  var text = $('textarea.warrior').val().split('\n');
  var parser = new Parser(text);
  var warrior = parser.getWarrior();

  $('.warrior-info').html('Program <strong>' + warrior.getName() + '</strong> (length ' + warrior.getLength() + ') by <strong>' + warrior.getAuthor() + '</strong>');
  $('table.warrior tbody').html('');

  for(var i = 0, code = warrior.getCode(); i < code.length; i++) {
    var current = code[i];
    var start = '';
    if(i == warrior.getStart()) {
      start = 'START';
    }
    $('table.warrior tbody').append('<tr>' +
      '<td>' + start + '</td>' +
      '<td>' + current.getOpcode().toUpperCase() + '.' + current.getModifier().toUpperCase() + '</td>'+
      '<td>' + current.getA().getMode().toUpperCase() + '</td>' +
      '<td>' + current.getA().getValue() + '</td>' +
      '<td>' + current.getB().getMode().toUpperCase() + '</td>' +
      '<td>' + current.getB().getValue() + '</td></tr>');
  }

  field.addWarrior(warrior);
});