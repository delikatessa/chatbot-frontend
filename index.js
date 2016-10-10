var builder = require('botbuilder');
var restify = require('restify');

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

bot.dialog('/', function (session) {
    session.send("Hi " + session.message.user.name + ", I�m your personal idea scout, designed to help you find inspiring ideas in the form of TED and TEDx talks from all over the world! Just enter a topic you�re interested in and I�ll give you some fitting suggestions.");
    session.beginDialog('/search');
});

bot.dialog('/search', [
    function (session) {
        builder.Prompts.choice(session, "How would you like to get started?", ["Search", "Inspire me"]);
    },
    function (session, results, next) {
        if (results.response.entity === "Inspire me") {
            session.conversationData.discover = true;
            session.userData.discoverIteration = 1;
            next();
        } else {
            session.conversationData.discover = false;
            session.conversationData.searchIteration = 1;
            builder.Prompts.text(session, "Ok, what are you interested in?");
        }
    },
    function (session, results, next) {
        if (!session.conversationData.discover) {
            session.conversationData.searchTerm = results.response;
        }
        Search(session, function () {
            next();
        });
    },
    function (session) {
        session.beginDialog('/more');
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
            builder.Prompts.choice(session, msg, ["Sure", "I'm good"]);
        } else {
            session.beginDialog('/finish');
        }
    },
    function (session, results) {
        if (results.response.entity === "Sure") {
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
        builder.Prompts.choice(session, "Is there anything else you�d like to do?", ["Sure", "I'm good"]);
    },
    function (session, results) {
        if (results.response.entity === "Sure") {
            session.beginDialog('/search');
        } else {
            session.send("Thanks for dropping by! Come back anytime for a further dose of inspiration. Talk to you soon!");
            session.endConversation();
        }
    }
]);

function Search(session, next) {
    var youtube = require('youtube-search');
    //NOTE: Search results are constrained to a maximum of 500 videos if your request specifies a value for the channelId parameter and sets the type parameter value to video
    var iteration;
    var searchTerm;
    if (session.conversationData.discover) {
        searchTerm = '';
        iteration = session.userData.discoverIteration;
    } else {
        searchTerm = session.conversationData.searchTerm;
        iteration = session.conversationData.searchIteration;
    }
    var order = 'relevance';
    if (session.conversationData.discover) {
        var orders = ['date', 'rating', 'relevance', 'title', 'videoCount', 'viewCount'];
        order = orders[Random(0, 5)];
    }
    var opts = {
        maxResults: 3 * iteration,
        key: 'AIzaSyA491fhVfZBa5qZPBQx6zjAn1bmc4SRkjY',
        part: 'snippet',
        order: order,
        chart: 'mostPopular',
        channelId: 'UCsT0YIqwnpJCM-mx7-gSA4Q',
        type: 'video'
    };
    youtube(searchTerm, opts, function (err, results) {
        if (err) {
            builder.Prompts.text(session, err);
            return;
        }
        if (results) {
            if (iteration > 1 && results.length > 3 * (iteration - 1)) {
                results = results.slice(3 * (iteration - 1));
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
                session.send("Sorry " + session.message.user.name + ", I couldn't find anything.");
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