
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
});