var add = function(that, pc, modifier, a_adr, b_adr) {
  switch(modifier) {
    /**
     * add A-number of A address to A-number of B address
     * add B-number of A address to B-number of B address
     */
    case "f":
    case "i": {
      var a_nr = that.getANumber(a_adr);
      a_nr += that.getANumber(b_adr);
      a_nr = that.sanitizeAddress(a_nr);

      var b_nr = that.getBNumber(a_adr);
      b_nr += that.getBNumber(b_adr);
      b_nr = that.sanitizeAddress(b_nr);

      that.setANumber(b_adr, a_nr);
      that.setBNumber(b_adr, b_nr);
    } break;

    /**
     * add A-number of A address to A-number of B address
     */
    case "a": {
      var a_nr = that.getANumber(a_adr);
      a_nr += that.getANumber(b_adr);
      a_nr = that.sanitizeAddress(a_nr);

      that.setANumber(b_adr, a_nr);
    } break;

    /**
     * add B-number of A address to B-number of B address
     */
    case "b": {
      var b_nr = that.getBNumber(a_adr);
      b_nr += that.getBNumber(b_adr);
      b_nr = that.sanitizeAddress(b_nr);

      that.setBNumber(b_adr, b_nr);
    } break;

    /**
     * add A-number of A address to B-number of B address
     */
    case "ab": {
      var a_nr = that.getANumber(a_adr);
      a_nr += that.getBNumber(b_adr);
      a_nr = that.sanitizeAddress(a_nr);

      that.setBNumber(b_adr, a_nr);
    } break;

    /**
     * add B-number of A address to A-number of B address
     */
    case "ba": {
      var b_nr = that.getBNumber(a_adr);
      b_nr += that.getANumber(b_adr);
      b_nr = that.sanitizeAddress(b_nr);

      that.setBNumber(b_adr, b_nr);
    } break;

    /**
     * add A-number of A address to B-number of B address
     * add B-number of A address to A-number of B address
     */
    case "x": {
      var a_nr = that.getANumber(a_adr);
      a_nr += that.getBNumber(b_adr);
      a_nr = that.sanitizeAddress(a_nr);

      var b_nr = that.getBNumber(a_adr);
      b_nr += that.getANumber(b_adr);
      b_nr = that.sanitizeAddress(b_nr);

      that.setANumber(b_adr, b_nr);
      that.setBNumber(b_adr, a_nr);
    } break;

    // Unknown modifier
    default: {
      console.log("ADD - unknown modifier:", modifier);
    }
  }

  if(that.updateCallback) {
    that.field[a_adr].setLastAction("read");
    that.field[b_adr].setLastAction("write");
    that.field[b_adr].setLastUser(that.currentWarrior);
  }
};

module.exports = add;
