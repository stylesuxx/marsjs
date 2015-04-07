var cmp = function(that, pc, modifier, a_adr, b_adr) {
  switch(modifier) {
    /**
     * A-number at A address == A-number at B address: pc + 2
     * else: pc + 1
     */
    case "a": {
      var address = pc + 1;
      var a_nr_a = that.getANumber(a_adr);
      var a_nr_b = that.getANumber(b_adr);

      if(a_nr_a == a_nr_b) {
        address = pc + 2;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    /**
     * B-number at A address == B-number at B address: pc + 2
     * else: pc + 1
     */
    case "b": {
      var address = pc + 1;
      var b_nr_a = that.getBNumber(a_adr);
      var b_nr_b = that.getBNumber(b_adr);

      if(b_nr_a == b_nr_b) {
        address = pc + 2;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    /**
     * A-number at A address == B-number at B address: pc + 2
     * else: pc + 1
     */
    case "ab": {
      var address = pc + 1;
      var a_nr_a = that.getANumber(a_adr);
      var b_nr_b = that.getBNumber(b_adr);

      if(a_nr_a == b_nr_b) {
        address = pc + 2;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    /**
     * B-number at A address == A-number at B address: pc + 2
     * else: pc + 1
     */
    case "ba": {
      var address = pc + 1;
      var b_nr_a = that.getBNumber(a_adr);
      var a_nr_b = that.getANumber(b_adr);

      if(b_nr_a == a_nr_b) {
        address = pc + 2;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    /**
     * A-number at A address == A-number at B address AND
     * B-number at A address == B-number at B address: pc + 2
     * else: pc + 1
     */
    case "f": {
      var address = pc + 1;
      var a_nr_a = that.getANumber(a_adr);
      var a_nr_b = that.getANumber(b_adr);
      var b_nr_a = that.getBNumber(a_adr);
      var b_nr_b = that.getBNumber(b_adr);

      if((a_nr_a == a_nr_b) && (b_nr_a == b_nr_b)) {
        address = pc + 2;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    /**
     * A-number at A address == B-number at B address AND
     * B-number at A address == A-number at B address: pc + 2
     * else: pc + 1
     */
    case "x": {
      var address = pc + 1;
      var a_nr_a = that.getANumber(a_adr);
      var a_nr_b = that.getANumber(b_adr);
      var b_nr_a = that.getBNumber(a_adr);
      var b_nr_b = that.getBNumber(b_adr);

      if((a_nr_a == b_nr_b) && (b_nr_a == a_nr_b)) {
        address = pc + 2;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    /**
     * Instruction at A address == Instruction at B address: pc + 2
     * else: pc + 1
     */
    case "i": {
      var address = pc + 1;
      var a = that.field[a_adr].getInstruction();
      var b = that.field[b_adr].getInstruction();

      if((a.getOpcode() == b.getOpcode()) &&
         (a.getModifier() == b.getModifier()) &&
         (a.getA().getValue() == b.getA().getValue()) &&
         (a.getA().getMode() == b.getA().getMode()) &&
         (a.getB().getValue() == b.getB().getValue()) &&
         (a.getB().getMode() == b.getB().getMode())
        ) {
        address = pc + 2;
      }
      address = that.sanitizeAddress(address);

      that.currentWarrior.pushPC(address);
    } break;

    // Unknown modifier
    default: {
      console.log("CMP - unknown modifier:", modifier);
    }
  }

  if(that.updateCallback) {
    that.field[a_adr].setLastAction("read");
    that.field[b_adr].setLastAction("read");
  }
};

module.exports = cmp;
