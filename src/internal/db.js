var pgp = require('pg-promise')();
var Term = require('../classes/term');
var User = require('../classes/user');

pgp.pg.defaults.ssl = true;

let db = pgp("postgres://vuocyocrfutmsr:826a2dc08f11859bf30baf181fe98e6aaeffde086bcf7964d19f5a9b99f5ca6e@ec2-54-247-119-245.eu-west-1.compute.amazonaws.com:5432/d2ljg1lvknlha0");

exports.getUser = function(item, callback) {
    //var item = new User(channel, external_id);
    db.one("INSERT INTO ideabot.user(channel, external_id, first_name, last_name, gender, locale, timezone, profile_pic) VALUES(${channel}, ${external_id}, ${first_name}, ${last_name}, ${gender}, ${locale}, ${timezone}, ${profile_pic}) ON CONFLICT ON CONSTRAINT user_key DO UPDATE SET channel = EXCLUDED.channel RETURNING id;", item)
        .then(function (data) {
            item.id = data.id;
            callback(item);
        })
        .catch(function (error) {
            console.log("ERROR.Postgresql:", error.message || error);
    });
}

exports.updateUser = function(item) {
    db.none("UPDATE ideabot.user SET first_name=${first_name}, gender=${gender}, locale=${locale}, timezone=${timezone} WHERE id=${id}", item)
        .catch(function (error) {
            console.log("ERROR.Postgresql:", error.message || error);
        });
}

exports.getTerm = function(text, callback) {
    const item = new Term(text);
    db.one("INSERT INTO ideabot.term(text, weight) VALUES(${text}, ${weight}) ON CONFLICT ON CONSTRAINT term_key DO UPDATE SET weight = EXCLUDED.weight + 1 RETURNING id;", item)
        .then(function (data) {
            item.id = data.id;
            callback(item);
        })
        .catch(function (error) {
            console.log("ERROR.Postgresql:", error.message || error);
    });
}

exports.insertUserAction = function(userId, action, term, talkId, callback) {
    db.none("INSERT INTO ideabot.user_action(user_id, action, term, talk_id) VALUES($1, $2, $3, $4)", [userId, action, term, talkId])
        .then(function (data) {
            callback();
        })
        .catch(function (error) {
            console.log("ERROR.Postgresql:", error.message || error);
        });
}

exports.insertTalk = function(item) {
    db.none("INSERT INTO ideabot.talk(source, external_id, user_id, category, type, title, speaker, event, url, thumbnail_url, published_at, full_title) VALUES(${source}, ${external_id}, ${user_id},  ${category}, ${type}, ${title}, ${speaker}, ${event}, ${url}, ${thumbnail_url}, ${published_at}, ${full_title}) ON CONFLICT ON CONSTRAINT talk_key DO NOTHING;", item)
        .then(function (data) {
            callback(data.id);
        })
        .catch(function (error) {
            console.log("ERROR.Postgresql:", error.message || error);
        });
}