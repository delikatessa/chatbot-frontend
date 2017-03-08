var Talk = require('../classes/talk');
var Term = require('../classes/term');
var User = require('../classes/user');
var db = require('./db');
var moment = require('moment');
var searcher = require('./search')
var text = require("./text.json");
var settings = require('./settings.json');
//var fb = require('../external/facebook/facebook');


module.exports = {
    processUser: processUser,
    processSearchRequest: processSearchRequest
}

function processUser(session, callback) {
    if (session.userData.user !== undefined && session.userData.user.external_id === session.message.user.id) {
        checkUserData(session, callback);
    } else {
        db.getUser('fb', session.message.user.id, function (user) {
            //b.getUserPublicProfile()
            session.userData.user = user;
            checkUserData(session, callback);
        });        
    }    
}

function checkUserData(session, callback) {
    var att = session.message.attachments;
    if (att.length === 1 && att[0].contentType === 'image/png' && att[0].contentUrl.indexOf('369239') !== -1) {
        session.send(text.emoticons.thumbsup);
        session.sendTyping();
    }
    var last = typeof session.conversationData.lastSendTime !== 'undefined';
    var diff = 0;
    if (last) {
        var now = Date.now();
        diff = moment.duration(now - session.conversationData.lastSendTime).asHours();;
    }
    var first = typeof session.userData.firstRun === 'undefined';
    if (first || typeof session.conversationData.retries === 'undefined') {
        session.conversationData.retries = 0;
    }
    if (!first && (!last || diff > 1)) {
        session.beginDialog('/reset');
    } else {
        session.userData.firstRun = first;
        session.conversationData.lastSendTime = session.lastSendTime;
        callback();
    }
}

function processSearchRequest(session, callback) {
    if (session.conversationData.inspire === true) {
        var allTalks = session.conversationData.inspireTalks;
        if (allTalks !== undefined && allTalks.length > 0) {
            sendTalks(session, allTalks, callback);
        } else {
            search(session, 'inspire', 0, callback);
        }
    } else {
        text = session.conversationData.searchTerm.trim().toLowerCase();
        if (session.conversationData.term !== undefined && session.conversationData.term.text === text) {
            var allTalks = session.conversationData.searchTalks;
            if (allTalks !== undefined && allTalks.length > 0) {
                sendTalks(session, allTalks, callback);
            } else {
                search(session, 'search', session.conversationData.term.id, callback);
            }
        } else {
            db.getTerm(text, function (term) {
                session.conversationData.term = term;
                search(session, 'search', term.id, callback);
            });
        }
    }
}

function sendTalks(session, allTalks, callback) {
    var num = Math.min(settings.SEARCH_RESULTS_NUMBER, allTalks.length);
    var talks = allTalks.slice(0, num);
    searcher.sendResults(session, talks);
    allTalks.splice(0, num);
    callback();
}

function search(session, action, termId, callback) {
    db.insertUserAction(session.userData.user.id, action, termId, function() {
        searcher.search(session, function(talks) {
            db.insertTalks(talks);
            callback();
        });
    });
}