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
