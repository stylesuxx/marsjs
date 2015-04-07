var div = function(that, pc, modifier, a_adr, b_adr) {
  switch(modifier) {
    /**
     * divide A-number of B address by A-number of A address
     * divide B-number of B address by B-number of A address
     */
    case "f":
    case "i": {
      var a_nr = that.getANumber(b_adr);
      a_nr /= that.getANumber(a_adr);
      a_nr = that.sanitizeAddress(a_nr);

      var b_nr = that.getBNumber(b_adr);
      b_nr /= that.getBNumber(a_adr);
      b_nr = that.sanitizeAddress(b_nr);

      if(isNaN(a_nr) || isNaN(b_nr)) {
        throw "Division by 0";
      }

      that.setANumber(b_adr, a_nr);
      that.setBNumber(b_adr, b_nr);
    } break;

    /**
     * divide A-number of B address by A-number of A address
     */
    case "a": {
      var a_nr = that.getANumber(b_adr);
      a_nr /= that.getANumber(a_adr);
      a_nr = that.sanitizeAddress(a_nr);

      if(isNaN(a_nr)) {
        throw "Division by 0";
      }

      that.setANumber(b_adr, a_nr);
    } break;

    /**
     * divide B-number of B address by B-number of A address
     */
    case "b": {
      var b_nr = that.getBNumber(b_adr);
      b_nr /= that.getBNumber(a_adr);
      b_nr = that.sanitizeAddress(b_nr);

      if(isNaN(b_nr)) {
        throw "Division by 0";
      }

      that.setBNumber(b_adr, b_nr);
    } break;

    /**
     * divide B-number of B address by A-number of A address
     */
    case "ab": {
      var a_nr = that.getBNumber(b_adr);
      a_nr /= that.getANumber(a_adr);
      a_nr = that.sanitizeAddress(a_nr);

      if(isNaN(a_nr)) {
        throw "Division by 0";
      }

      that.setBNumber(b_adr, a_nr);
    } break;

    /**
     * divide A-number of B address by B-number of A address
     */
    case "ba": {
      var b_nr = that.getANumber(b_adr);
      b_nr /= that.getBNumber(a_adr);
      b_nr = that.sanitizeAddress(b_nr);

      if(isNaN(b_nr)) {
        throw "Division by 0";
      }

      that.setANumber(b_adr, b_nr);
    } break;

    /**
     * divide B-number of B address by A-number of A address
     * divide A-number of B address by B-number of A address
     */
    case "x": {
      var a_nr = that.getBNumber(b_adr);
      a_nr /= that.getANumber(a_adr);
      a_nr = that.sanitizeAddress(a_nr);

      var b_nr = that.getANumber(b_adr);
      b_nr /= that.getBNumber(a_adr);
      b_nr = that.sanitizeAddress(b_nr);

      if(isNaN(a_nr) || isNaN(b_nr)) {
        throw "Division by 0";
      }

      that.setBNumber(b_adr, a_nr);
      that.setANumber(b_adr, b_nr);
    } break;

    // Unknown modifier
    default: {
      console.log("DIV - unknown modifier:", modifier);
    }
  }

  if(that.updateCallback) {
    that.field[a_adr].setLastAction("read");
    that.field[b_adr].setLastAction("write");
    that.field[b_adr].setLastUser(that.currentWarrior);
  }
};

module.exports = div;
