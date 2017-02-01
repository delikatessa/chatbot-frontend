var builder = require('botbuilder');
var restify = require('restify');
var moment = require('moment');
var youtube = require('youtube-search');
var text = require("./text.json");

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

bot.beginDialogAction('about', '/greeting', { matches: /^about/i });
bot.beginDialogAction('search', '/search', { matches: /^search/i });
bot.beginDialogAction('inspire', '/inspire', { matches: /^inspire/i, promptAfterAction: false });
bot.beginDialogAction('restart', '/restart', { matches: /^restart/i });
bot.beginDialogAction('bye', '/goodbye', { matches: /^bye/i });
bot.beginDialogAction('test', '/test', { matches: /^testtesttest/i });

bot.dialog('/test', function(session) {
    if (typeof session.message.entities === "undefined"){
        session.send('no entities');
    } else {
        session.send('entities');
        for (var i = 0; i < session.message.entities.length; i++){
            session.send(session.message.entities[i].type);
        }
    }
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

bot.dialog('/restart', [
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
        builder.Prompts.choice(session, msg, getText(text.search.menu), { retryPrompt: getRetryPrompt(session, msg) });
    },
    function (session, results) {
        if (results.response.entity.indexOf("Inspire") !== -1) {
            session.beginDialog('/inspire');
        } else {
            session.beginDialog('/search');
        }
    }
]);

bot.dialog('/search', [
    function (session) {
        session.conversationData.discover = false;
        session.conversationData.searchIteration = 1;
        builder.Prompts.text(session, getText(text.search.topic));
    },
    function (session, results) {
        session.conversationData.searchTerm = results.response;
        console.log("SEARCH: " + results.response);
        Search(session, function () {
            session.beginDialog('/more');
        });
    }
]);

bot.dialog('/inspire', [
    function (session) {
        session.conversationData.discover = true;
        var iter = session.userData.discoverIteration;
        if (typeof iter !== 'undefined' && iter > 1) {
            session.userData.discoverIteration++;
        } else {
            session.userData.discoverIteration = 1;
        }
        session.conversationData.searchTerm = '';
        Search(session, function () {
            session.beginDialog('/more');
        });
    }
]);

bot.dialog('/more', [
    function (session) {
        if (session.conversationData.found) {
            var msg;
            if (session.conversationData.discover) {
                msg = getText(text.search.moreInspire);
            } else {
                msg = getText(text.search.moreSearch);
            }
            builder.Prompts.choice(session, msg, getText(text.search.buttons), { retryPrompt: getRetryPrompt(session, msg) });
        } else {
            session.beginDialog('/finish');
        }
    },
    function (session, results) {
        if (results.response.entity.indexOf("Sure") !== -1) {
            if (session.conversationData.discover) {
                session.userData.discoverIteration++;
            } else {
                session.conversationData.searchIteration++;
            }
            Search(session, function () {
                session.replaceDialog('/more', { reprompt: true });
            });
        } else {
            session.beginDialog('/finish');
        }
    }
]);

bot.dialog('/finish', [
    function (session) {
        var msg = getText(text.start.continue);
        builder.Prompts.choice(session, msg, getText(text.start.buttons), { retryPrompt: getRetryPrompt(session, msg), bargeInAllowed: false });
    },
    function (session, results) {
        if (results.response.entity.indexOf("Yes") !== -1) {
            session.beginDialog('/start');
        } else {
            session.beginDialog('/goodbye');
        }
    }
]);

bot.dialog('/goodbye', [
    function (session) {
        session.send(getText(text.end));
        session.endConversation();
    }
]);

function getRetryPrompt(session, msg) {
    var prompts = getText(text.retryPrompts, session);
    for (var i = 0; i < prompts.length; ++i) {
        prompts[i] += msg;
    }
    return prompts;
}

var MAX_RESULTS = 5;

function Search(session, next) {
    var iteration;
    var searchTerm = session.conversationData.searchTerm;
    if (session.conversationData.discover) {
        iteration = session.userData.discoverIteration;
    } else {
        iteration = session.conversationData.searchIteration;
    }
    var order;
    var maxResults;
    if (session.conversationData.discover) {
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
            if (session.conversationData.discover) {
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
                session.send(getText(text.search.noResults, session));
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
            diff = moment.duration(now - session.conversationData.lastSendTime).asHours();
        }
        var first = typeof session.userData.firstRun === 'undefined';
        if (!first && (!last || diff > 1)) {
            session.beginDialog('/restart');
        } else {
            session.userData.firstRun = first;
            session.conversationData.lastSendTime = session.lastSendTime;
            next();
        }
    }
});

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