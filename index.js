var builder = require('botbuilder');
var restify = require('restify');
var moment = require('moment');
var youtube = require('youtube-search');

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

var connector = new builder.ChatConnector({
    appId: '6efc2601-344a-4e6b-a942-6a4bc8475e74',//process.env.MICROSOFT_APP_ID,
    appPassword: 'kxBVpkV8yOCnddhf1ctv5iZ'//process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector, { persistConversationData: true });
server.post('/api/messages', connector.listen());

bot.use(builder.Middleware.dialogVersion({ version: 1.0, resetCommand: /^restart/i }));

bot.beginDialogAction('help', '/about', { matches: /^help/i });
bot.beginDialogAction('find', '/search', { matches: /^find/i });
bot.beginDialogAction('discover', '/inspire', { matches: /^discover/i });
bot.beginDialogAction('restart', '/restart', { matches: /^restart/i });
bot.beginDialogAction('good', '/thumbup', { matches: /^\ud83d\udc4d/i });
bot.endConversationAction('goodbye', '/goodbye', { matches: /^bye/i });

bot.dialog('/', function (session) {
    var msg = "Hi " + GetUserName(session) + ", ";
    if (typeof session.userData.firstRun === 'undefined') {
        msg += "I'm your personal idea scout \ud83e\udd16, designed to help you find inspiring ideas in the form of TEDx talks from all over the world \ud83d\udca1\ud83c\udf0d! Just enter a topic you're interested in and I'll give you some fitting suggestions.";
    } else {
        msg += "good to have you back! \u270c I'd love to scout some more TEDx ideas \ud83d\udca1 for you!";
    }
    session.send(msg);
    session.conversationData.lastSendTime = session.lastSendTime;
    session.userData.firstRun = true;
    session.beginDialog('/start');
});

bot.dialog('/about', [
    function (session) {
        var msg = "Hi " + GetUserName(session) + ", I'm your personal idea scout \ud83e\udd16, designed to help you find inspiring ideas in the form of TEDx talks from all over the world \ud83d\udca1\ud83c\udf0d! Just enter a topic you're interested in and I'll give you some fitting suggestions.";
        session.endDialog(msg);
    }
]);

bot.dialog('/thumbup', [
    function (session) {
        session.endDialog("\ud83d\udc4d");
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
            msg = "How would you like to get started?";
            session.userData.firstRun = false;
        } else {
            msg = "What would you like to do?";
        }
        builder.Prompts.choice(session, msg, ["\ud83d\udd0e Search", "\ud83d\udca1 Inspire me"], { retryPrompt: GetRetryPrompt(session, msg) });
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
        builder.Prompts.text(session, "Ok, what are you interested in?");
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
                msg = "Would you like to get more inspiration?";
            } else {
                msg = "Would you like to get more inspiration on this topic?";
            }
            builder.Prompts.choice(session, msg, ["Sure", "No, I'm good"], { retryPrompt: GetRetryPrompt(session, msg) });
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
        var msg = "Is there anything else you’d like to do?";
        builder.Prompts.choice(session, msg, ["Yes", "No, thanks"], { retryPrompt: GetRetryPrompt(session, msg) });
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
        session.send("Thanks for dropping by! Come back anytime for a further dose of inspiration. Talk to you soon! \ud83d\udc4b");
        session.endConversation();
    }
]);

function GetRetryPrompt(session, msg) {
    return [
        "Sorry " + GetUserName(session) + ", I don't understand gibberish...\n\n" + msg,
        "Your wordsmith skills are just too much for me! I didn't get that.\n\n" + msg,
        "Oh stop it! I'm blushing. Or did I get that wrong?\n\n" + msg,
        "Asfdsjihu. Or did you mean omdjosfjsjn? Please choose one of the following options.\n\n" + msg];
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
        key: 'AIzaSyA491fhVfZBa5qZPBQx6zjAn1bmc4SRkjY',
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
            for (var i = 0, len = results.length; i < len; i++) {
                var result = results[i];
                var card = new builder.ThumbnailCard(session)
                    .title(result.title)
                    .tap(builder.CardAction.openUrl(session, result.link))
                    .buttons([builder.CardAction.openUrl(session, result.link, 'Watch now')])
                    .images([builder.CardImage.create(session, result.thumbnails.high.url)]);
                attachments.push(card);
            }
            if (results.length === 0) {
                session.send("Sorry " + GetUserName(session) + ", I couldn't find anything.");
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

function GetUserName(session) {
    return session.message.user.name.match(/([^\s]+)/i)[0];
}

bot.use({
    botbuilder: function (session, next) {
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
            session.conversationData.lastSendTime = session.lastSendTime;
            next();
        }
    }
});
