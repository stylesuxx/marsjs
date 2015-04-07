var djn = function(that, pc, modifier, a_adr, b_adr) {
  switch(modifier) {
    /**
     * decrement A-number at B address
     * if A-number at B address not 0: jump to A address
     * else: increase the counter by one
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
     * decrement B-number at B address
     * if B-number at B address not 0: jump to A address
     * else: increase the counter by one
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
     * decrement A-number at B address
     * decrement B-number at B address
     * if A-number or B-number at B address not 0: jump to A address
     * else: increase the counter by one
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

      if(a_nr !== 0 || b_nr !== 0) {
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
