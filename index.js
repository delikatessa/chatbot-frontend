var builder = require('botbuilder');
var ctrl = require('./internal/controller')
var moment = require('moment');
var restify = require('restify');
var text = require("./internal/text.json");
var utils = require('./internal/utils')

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector, { persistConversationData: true });
server.post('/api/messages', connector.listen());

bot.beginDialogAction('hi', '/', { matches: /^\bhi\b|\bhello\b|\bhey\b|\bhallo\b/i });
bot.beginDialogAction('about', '/greeting', { matches: /^about|help/i });
bot.beginDialogAction('search', '/search', { matches: /^search/i });
bot.beginDialogAction('inspire', '/inspire', { matches: /^inspire/i, promptAfterAction: false });
bot.beginDialogAction('reset', '/reset', { matches: /^reset/i });
bot.beginDialogAction('bye', '/goodbye', { matches: /^bye\b/i });
bot.beginDialogAction('test', '/test', { matches: /^test/i });

bot.dialog('/test', function(session) {
    session.send(JSON.stringify(session.message.user))
    session.endDialog();
});

bot.dialog('/', function (session) {
    var msg;
    if (typeof session.userData.firstRun === 'undefined') {
        msg = utils.getText(text.greeting.first, session);
    } else {
        msg = utils.getText(text.greeting.back, session);
    }
    session.send(msg);
    session.sendTyping();
    session.conversationData.lastSendTime = session.lastSendTime;
    session.conversationData.retries = 0;
    session.userData.firstRun = true;    
    session.beginDialog('/start');
});

bot.dialog('/greeting', [
    function (session) {
        var greeting = utils.getText(text.greeting.first, session);
        session.send(greeting);
        session.sendTyping();
        session.endDialog();
    }
]);

bot.dialog('/start', [
    function (session) {
        var msg;
        if (typeof session.userData.firstRun === 'boolean' && session.userData.firstRun) {
            msg = utils.getText(text.start.first);
            session.userData.firstRun = false;
        } else {
            msg = utils.getText(text.start.back);
        }
        utils.sendQuickRepliesMessage(session, msg, utils.getText(text.start.replies));
    },
    function (session, results) {
        if (utils.textContains(results.response, text.syn.search)) {
            session.conversationData.retries = 0;
            session.beginDialog('/search');
        } else if (utils.textContains(results.response, text.syn.inspire)) {
            session.conversationData.retries = 0;
            session.beginDialog('/inspire')
        } else {
            retry(session, text.start.choices, '/start');
        }        
    }
]);

bot.dialog('/search', [
    function (session) {
        session.conversationData.inspire = false;
        session.conversationData.searchIteration = 1;
        builder.Prompts.text(session, utils.getText(text.search.topic));
    },
    function (session, results) {
        session.conversationData.searchTerm = results.response;
        ctrl.processSearchRequest(session, function() {
            session.beginDialog('/continue');
        });
    }
]);

bot.dialog('/inspire', [
    function (session) {
        session.conversationData.inspire = true;
        var iter = session.conversationData.inspireIteration;
        if (typeof iter !== 'undefined' && iter > 1) {
            session.conversationData.inspireIteration++;
        } else {
            session.conversationData.inspireIteration = 1;
        }
        session.conversationData.searchTerm = '';
        ctrl.processSearchRequest(session, function() {
            session.beginDialog('/continue');
        });
        // searcher.search(session, function() {
        //     session.beginDialog('/continue');
        // });
    }
]);

bot.dialog('/continue', [
    function (session) {
        if (session.conversationData.found) {
            var msg;
            if (session.conversationData.inspire) {
                msg = utils.getText(text.continue.inspire);
            } else {
                msg = utils.getText(text.continue.search);
            }
            utils.sendQuickRepliesMessage(session, msg, text.continue.replies);
        } else {
            session.beginDialog('/restart');
        }
    },
    function (session, results) {
        if (utils.textContains(results.response, text.syn.yes)) {
            session.conversationData.retries = 0;
            if (session.conversationData.inspire) {
                session.conversationData.inspireIteration++;
            } else {
                session.conversationData.searchIteration++;
            }
            ctrl.processSearchRequest(session, function() {
                session.replaceDialog('/continue', { reprompt: true });
            });            
        } else if (utils.textContains(results.response, text.syn.no)) {            
            session.conversationData.retries = 0;
            session.beginDialog('/restart');
        } else {
            retry(session, text.continue.choices, '/continue');
        }
    }
]);

bot.dialog('/restart', [
    function (session) {
        var msg = utils.getText(text.restart.ask);
        utils.sendQuickRepliesMessage(session, msg, text.restart.replies);        
    },
    function (session, results) {
        if (utils.textContains(results.response, text.syn.yes)) {
            session.conversationData.retries = 0;
            session.beginDialog('/start');
        } else if (utils.textContains(results.response, text.syn.no)) {
            session.conversationData.retries = 0;
            session.beginDialog('/goodbye');
        } else {
            retry(session, text.restart.choices, '/restart');
        }
    }
]);

bot.dialog('/goodbye', [
    function (session) {
        session.conversationData.retries = 0;
        session.send(utils.getText(text.end));
        session.endConversation();
    }
]);

//TODO https://docs.botframework.com/en-us/core-concepts/userdata#deletinguserdata
bot.dialog('/reset', [
    function (session) {
        session.userData = {};
        session.conversationData = {};
        session.beginDialog("/");
    }
]);

bot.use({
    botbuilder: function (session, callback) {
        session.sendTyping();
        if (session.userData.user !== undefined && session.userData.user.external_id === session.message.user.id) {
            checkUserData(session, callback);
        } else {
            ctrl.processUser(session, function(user) {
                session.userData.user = user;
                checkUserData(session, callback);
            });
        }     
    }
});

function checkUserData(session, callback) {
    var att = session.message.attachments;
    if (att.length === 1 && att[0].contentType === 'image/png' && att[0].contentUrl.indexOf('369239') !== -1) {
        session.send("\ud83d\udc4d");
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

function retry(session, choices, dialog) {
    if (session.conversationData.retries === 2) {
        session.conversationData.retries = 0;
        utils.sendHelpMessage(session, choices);
    } else {
        session.conversationData.retries++;
        utils.sendRetryPrompt(session);
    }    
    session.replaceDialog(dialog, { reprompt: true });
}