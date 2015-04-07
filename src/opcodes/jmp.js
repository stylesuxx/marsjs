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
