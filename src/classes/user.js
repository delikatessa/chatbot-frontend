function User(channel, external_id) {
  this.id = 0;
  this.channel = channel;
  this.external_id = external_id;
  this.first_name = null;
  this.gender = null;
  this.locale = null;
  this.timezone = null;
}

module.exports = User;