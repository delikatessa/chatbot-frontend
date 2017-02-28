var Talk = require('../classes/talk');
var Term = require('../classes/term');
var User = require('../classes/user');
var db = require('./db');
var searcher = require('./search')

//var fb = require('../external/facebook/facebook');

exports.processUser = function(session, callback) {
    db.getUser('fb', session.message.user.id, callback);
}

exports.processSearchRequest = function(session, callback) {
    if (session.conversationData.inspire === false) {
        text = session.conversationData.searchTerm.trim().toLowerCase();
        if (session.userData.term !== undefined && term.text === text) {
            search(session, 'search', session.userData.term.id, callback);
        } else {
            db.getTerm(text, function(term) {
                session.userData.term = term;
                search(session, 'search', term.id, callback);
            });
        }        
    } else {
        search(session, 'inspire', 0, callback);
    }
}

function search(session, action, termId, callback) {
    db.insertUserAction(session.userData.user.id, action, termId, function() {
        searcher.search(session, function(talks) {
            db.insertTalks(talks);
            callback();
        });
    });
}