// Constructor
function Term(text) {
  // always initialize all instance properties
  this.id = 0;
  this.text = text.trim().toLowerCase();
  this.weight = 1;
}
// class methods
// User.prototype.someFunction = function() {

// };
// export the class
module.exports = Term;