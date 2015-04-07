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
