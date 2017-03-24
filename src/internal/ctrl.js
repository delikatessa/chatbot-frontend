var Talk = require('../classes/talk');
var Term = require('../classes/term');
var User = require('../classes/user');
var db = require('../external/db');
var moment = require('moment');
var searcher = require('./search')
var text = require("../resources/text.json");
var settings = require('../resources/settings.json');
var fb = require('../external/facebook');

module.exports = {
    processUser: processUser,
    processSearchRequest: processSearchRequest
}

function processUser(session, callback) {
    if (session.userData.user !== undefined && session.userData.user.external_id === session.message.user.id) {
        checkUserData(session, callback);
    } else {
        const user = new User('fb', session.message.user.id);
        fb.getUserPublicProfile(user.external_id, function (data) {
            user.setProfileData(data);
            db.getUser(user, function (user2) {
                session.userData.user = user2;
                checkUserData(session, callback);
            });
        });
    }
}

function checkUserData(session, callback) {
    const att = session.message.attachments;
    if (att.length === 1 && att[0].contentType === 'image/png' && att[0].contentUrl.indexOf('369239') !== -1) {
        session.send(text.emoticons.thumbsup);
        session.sendTyping();
    }
    const last = session.conversationData.lastVisited !== undefined;
    let diff = 0;
    if (last) {
        const now = moment().unix();
        diff = moment.duration(now - session.conversationData.lastVisited).asHours();;
    }
    const first = session.userData.firstRun === undefined;
    if (first || session.conversationData.retries === undefined) {
        session.conversationData.retries = 0;
    }
    if (!first && (!last || diff > 1)) {
        session.beginDialog('/reset');
    } else {
        session.userData.firstRun = first;
        session.conversationData.lastVisited = session.lastSendTime;
        callback();
    }
}

function processSearchRequest(session, callback) {
    if (session.conversationData.inspire === true) {        
        const allTalks = session.conversationData.inspireTalks;
        if (allTalks !== undefined && allTalks.length > 0) {
            sendTalks(session, allTalks, callback);
        } else {
            search(session, 'inspire', callback);
        }
    } else {        
        if (session.conversationData.newTerm === session.conversationData.oldTerm) {
            const allTalks = session.conversationData.searchTalks;
            if (allTalks !== undefined && allTalks.length > 0) {
                sendTalks(session, allTalks, callback);
            } else {
                search(session, 'search', callback);
            }
        } else {
            session.conversationData.oldTerm = session.conversationData.newTerm;
            search(session, 'search', callback);
        }
    }
}

function sendTalks(session, allTalks, callback) {
    const num = Math.min(settings.SEARCH_RESULTS_NUMBER, allTalks.length);
    const talks = [];
    for (let obj of allTalks.slice(0, num)) {
        talks.push(new Talk(obj));
    }    
    searcher.sendResults(session, talks);
    allTalks.splice(0, num);
    callback();
}

function search(session, action, callback) {
    db.insertUserAction(session.userData.user.id, action, session.conversationData.newTerm, 0, function() {
        searcher.search(session, callback);
    });
}

function logWatched(userId, talk) {
    db.insertTalk(talk, function(talkId){
        db.insertUserAction(session.userData.user.id, "watch", term, talkId, callback);
    });
}