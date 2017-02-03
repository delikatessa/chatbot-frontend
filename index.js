var builder = require('botbuilder');
var moment = require('moment');
var restify = require('restify');
var request = require('request');
var text = require("./text.json");
var youtube = require('youtube-search');

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
        msg = getText(text.greeting.first, session);
    } else {
        msg = getText(text.greeting.back, session);
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
        var greeting = getText(text.greeting.first, session);
        session.send(greeting);
        session.sendTyping();
        session.endDialog();
    }
]);

bot.dialog('/reset', [
    function (session) {
        session.userData = {};
        session.conversationData = {};
        session.beginDialog("/");
    }
]);

bot.dialog('/start', [
    function (session) {
        var msg;
        if (typeof session.userData.firstRun === 'boolean' && session.userData.firstRun) {
            msg = getText(text.start.first);
            session.userData.firstRun = false;
        } else {
            msg = getText(text.start.back);
        }
        sendQuickRepliesMessage(session, msg, getText(text.start.replies));
    },
    function (session, results) {
        if (textContains(results.response, text.syn.search)) {
            session.conversationData.retries = 0;
            session.beginDialog('/search');
        } else if (textContains(results.response, text.syn.inspire)) {
            session.conversationData.retries = 0;
            session.beginDialog('/inspire')
        } else {
            retry(session, text.start.choices, '/start');
        }        
    }
]);

function retry(session, choices, dialog) {
    if (session.conversationData.retries === 2) {
        session.conversationData.retries = 0;
        sendHelpMessage(session, choices);
    } else {
        session.conversationData.retries++;
        sendRetryPrompt(session);
    }    
    session.replaceDialog(dialog, { reprompt: true });
}

function textContains(input, words) {
    input = input.toLowerCase();
    for (var i = 0; i < words.length; ++i) {
        if (input.indexOf(words[i]) != -1) {
            return true;
        }
    }
    return false;
}

function sendHelpMessage(session, choices) {
    var msg = getText(text.common.help, session).replace(/{choices}/g, getText(choices).join(" or "));
    session.send(msg);
    session.sendTyping();
}

var retryPrompts;
function sendRetryPrompt(session) {
    if (typeof retryPrompts === 'undefined') {
        retryPrompts = getText(text.retryPrompts);    
    }
    var i = Random(0, retryPrompts.length - 1);
    session.send(retryPrompts[i]);
    session.sendTyping();
}

bot.dialog('/search', [
    function (session) {
        session.conversationData.inspire = false;
        session.conversationData.searchIteration = 1;
        builder.Prompts.text(session, getText(text.search.topic));
    },
    function (session, results) {
        session.conversationData.searchTerm = results.response;
        console.log("SEARCH: " + results.response);
        search(session, function () {
            session.beginDialog('/continue');
        });
    }
]);

bot.dialog('/inspire', [
    function (session) {
        session.conversationData.inspire = true;
        var iter = session.userData.inspireIteration;
        if (typeof iter !== 'undefined' && iter > 1) {
            session.userData.inspireIteration++;
        } else {
            session.userData.inspireIteration = 1;
        }
        session.conversationData.searchTerm = '';
        search(session, function () {
            session.beginDialog('/continue');
        });
    }
]);

bot.dialog('/continue', [
    function (session) {
        if (session.conversationData.found) {
            var msg;
            if (session.conversationData.inspire) {
                msg = getText(text.continue.inspire);
            } else {
                msg = getText(text.continue.search);
            }
            sendQuickRepliesMessage(session, msg, text.continue.replies);
        } else {
            session.beginDialog('/restart');
        }
    },
    function (session, results) {
        if (textContains(results.response, text.syn.yes)) {
            session.conversationData.retries = 0;
            if (session.conversationData.inspire) {
                session.userData.inspireIteration++;
            } else {
                session.conversationData.searchIteration++;
            }
            search(session, function () {
                session.replaceDialog('/continue', { reprompt: true });
            });
        } else if (textContains(results.response, text.syn.no)) {            
            session.conversationData.retries = 0;
            session.beginDialog('/restart');
        } else {
            retry(session, text.continue.choices, '/continue');
        }
    }
]);

bot.dialog('/restart', [
    function (session) {
        var msg = getText(text.restart.ask);
        sendQuickRepliesMessage(session, msg, text.restart.replies);        
    },
    function (session, results) {
        if (textContains(results.response, text.syn.yes)) {
            session.conversationData.retries = 0;
            session.beginDialog('/start');
        } else if (textContains(results.response, text.syn.no)) {
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
        session.send(getText(text.end));
        session.endConversation();
    }
]);

var MAX_RESULTS = 5;

function search(session, next) {
    var iteration;
    var searchTerm = session.conversationData.searchTerm;
    if (session.conversationData.inspire) {
        iteration = session.userData.inspireIteration;
    } else {
        iteration = session.conversationData.searchIteration;
    }
    var order;
    var maxResults;
    if (session.conversationData.inspire) {
        var orders = ['date', 'rating', 'relevance', 'title', 'videoCount', 'viewCount'];
        order = orders[Random(0, 5)];
        maxResults = Random(MAX_RESULTS, 50);
    } else {
        order = 'relevance';
        maxResults = MAX_RESULTS * iteration % 500;
    }
    //https://developers.google.com/youtube/v3/docs/search/list
    var opts = {
        maxResults: maxResults,
        key: process.env.GOOGLE_API_KEY,
        part: 'snippet',
        order: order,
        chart: 'mostPopular',
        channelId: 'UCsT0YIqwnpJCM-mx7-gSA4Q',
        type: 'video',
        relevanceLanguage: 'en'
    };
    youtube(searchTerm, opts, function (err, results) {
        if (err) {
            builder.Prompts.text(session, err);
            return;
        }
        if (results) {
            if (session.conversationData.inspire) {
                var results2 = [];
                var idxs = [];
                while (results2.length < MAX_RESULTS) {
                    var idx = Random(1, maxResults) - 1;
                    if (idxs.indexOf(idx) === -1) {
                        results2.push(results[idx]);
                        idxs.push(idx);
                    }
                }
                results = results2;
            } else if (iteration > 1 && results.length > MAX_RESULTS * (iteration - 1)) {
                results = results.slice(MAX_RESULTS * (iteration - 1));
            }
            var attachments = [];
            var btnTitle = getText(text.search.watch);
            for (var i = 0, len = results.length; i < len; i++) {
                var result = results[i];
                var card = new builder.ThumbnailCard(session)
                    .title(result.title)
                    .tap(builder.CardAction.openUrl(session, result.link))
                    .buttons([builder.CardAction.openUrl(session, result.link, btnTitle)])
                    .images([builder.CardImage.create(session, result.thumbnails.high.url)]);
                attachments.push(card);
            }
            if (results.length === 0) {
                session.send(getText(text.error.noResults, session));
                session.conversationData.found = false;
            } else {
                session.conversationData.found = true;
                var reply = new builder.Message(session)
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(attachments);
                session.send(reply);
            }
        }
        next();
    });
}

function Random(low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}

bot.use({
    botbuilder: function (session, next) {
        session.sendTyping();
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
            next();
        }        
    }
});

function sendQuickRepliesMessage(session, msg, replies) {
    var replyMessage = new builder.Message(session).text(msg);
    var quickReplies = [];
    replies.forEach(function(reply) {
        quickReplies.push({
            content_type:"text",
            title: reply,
            payload: reply
        });            
    });
    replyMessage.sourceEvent({ 
        facebook: { 
            quick_replies: quickReplies
         }
    });
    builder.Prompts.text(session, replyMessage);
}

function getText(string, session) {
    var ret;
    if (string instanceof Array) {
        ret = string.join('|');
    } else {
        ret = string;
    }
    if (typeof session != 'undefined' && ret.indexOf("{user}") != -1) {
        var userName = session.message.user.name.match(/([^\s]+)/i)[0];
        ret = ret.replace(/{user}/g, userName);
    }
    if (ret.indexOf(":") != -1) {
        var emoticons = ret.match(/:\w+:/ig);
        emoticons.forEach(function(emoticon) {
            var key = emoticon.replace(/:/g, '');
            ret = ret.replace(emoticon, text.emoticons[key]);
        })
    }
    if (string instanceof Array) {
        return ret.split('|');
    } else {
        return ret;
    }    
}