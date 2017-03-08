function Term(text) {
  this.id = 0;
  this.text = text.trim().toLowerCase();
  this.weight = 1;
}

module.exports = Term;