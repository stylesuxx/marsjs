var spl = function(that, pc, modifier, a_adr, b_adr) {
  switch(modifier) {
    case "a":
    case "b":
    case "ab":
    case "ba":
    case "x":
    case "f":
    case "i": {
      that.currentWarrior.pushPC(pc + 1);
      that.currentWarrior.pushPC(a_adr);
    } break;

    default: {
      console.log("SPL - unknown modifier:", modifier);
    }
  }
};

module.exports = spl;
