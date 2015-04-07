var mov = function(that, pc, modifier, a_adr, b_adr) {
  switch(modifier) {
    /**
     * copy instruction from A address to instruction at B address
     */
    case "i": {
      var instruction = that.field[a_adr];

      that.field[b_adr] = Object.create(instruction);
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
