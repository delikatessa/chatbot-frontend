var pgp = require('pg-promise')();
var Term = require('../classes/term');
var User = require('../classes/user');

pgp.pg.defaults.ssl = true;

var db = pgp(process.env.DATABASE_URL)

exports.getUser = function(channel, external_id, callback) {
    var item = new User(channel, external_id);
    db.one("INSERT INTO ideabot.user(channel, external_id) VALUES(${channel}, ${external_id}) ON CONFLICT ON CONSTRAINT user_key DO UPDATE SET channel = EXCLUDED.channel RETURNING id;", item)
        .then(function (data) {
            item.id = data.id;
            callback(item);
        })
        .catch(function (error) {
            console.log("ERROR:", error.message || error);
    });
}

exports.updateUser = function(item) {
    db.none("UPDATE ideabot.user SET first_name=${first_name}, gender=${gender}, locale=${locale}, timezone=${timezone} WHERE id=${id}", item)
        .catch(function (error) {
            console.log("ERROR:", error.message || error);
        });
}

exports.getTerm = function(text, callback) {
    var item = new Term(text);
    db.one("INSERT INTO ideabot.term(text, weight) VALUES(${text}, ${weight}) ON CONFLICT ON CONSTRAINT term_key DO UPDATE SET weight = EXCLUDED.weight + 1 RETURNING id;", item)
        .then(function (data) {
            item.id = data.id;
            callback(item);
        })
        .catch(function (error) {
            console.log("ERROR:", error.message || error);
    });
}

exports.insertUserAction = function(userId, action, termId, callback) {
    db.none("INSERT INTO ideabot.user_action(user_id, action, term_id) VALUES($1, $2, $3)", [userId, action, termId])
        .then(function (data) {
            callback();
        })
        .catch(function (error) {
            console.log("ERROR:", error.message || error);
        });
}

exports.insertTalks = function(talks) {
    db.tx(function (t) {
        var queries = talks.map(function (l) {
            return t.none("INSERT INTO ideabot.talk(source, external_id, category, type, title, author, url, thumbnail_url, published_at) VALUES(${source}, ${external_id}, ${category}, ${type}, ${title}, ${author}, ${url}, ${thumbnail_url}, ${published_at}) ON CONFLICT ON CONSTRAINT talk_key DO NOTHING;", l);
        });
        return t.batch(queries);
    })
    .then(function (data) {
        data = data;
    })
    .catch(function (error) {
        console.log("ERROR:", error.message || error);
    });
}