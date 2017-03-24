module.exports = class User {
    constructor(channel, external_id) {
        this.id = 0;
        this.channel = channel;
        this.external_id = external_id;
        this.first_name = null;
        this.last_name = null;
        this.gender = null;
        this.locale = null;
        this.timezone = null;
        this.profile_pic = null;
    }

    setProfileData(data) {
        const profile = JSON.parse(data);
        this.first_name = profile.first_name;
        this.last_name = profile.last_name;
        this.gender = profile.gender;
        this.locale = profile.locale;
        this.timezone = profile.timezone;
        this.profile_pic = profile.profile_pic;
    }
}