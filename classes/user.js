// Constructor
function User(channel, external_id) {
  // always initialize all instance properties
  this.id = 0;
  this.channel = channel;
  this.external_id = external_id;
  this.first_name = null;
  this.gender = null;
  this.locale = null;
  this.timezone = null;
}
// class methods
// User.prototype.someFunction = function() {

// };
// export the class
module.exports = User;