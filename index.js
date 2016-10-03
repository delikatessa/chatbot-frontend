var builder = require('botbuilder');
var restify = require('restify');

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

var connector = new builder.ChatConnector({
    appId: '35f10801-e6e8-4bd3-a327-32f6ab3dc733',//process.env.MICROSOFT_APP_ID,
    appPassword: 'vKEen7ZkpGY7jT2och6qumD'//process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector, { persistConversationData: true });
server.post('/api/messages', connector.listen());

bot.dialog('/', function (session) {
    session.send("Hello! I am TEDxVienna bot and I can find the best TED talks for you.");
    session.beginDialog('/search');
});

bot.dialog('/search', [
    function (session) {
        builder.Prompts.choice(session, "So what would you like to do?", ["Search", "Inspire me!"]);
    },
    function (session, results, next) {
        if (results.response.entity === "Inspire me!") {
            session.conversationData.discover = true;
            session.userData.discoverIteration = 1;
            next();
        } else {
            session.conversationData.discover = false;
            session.conversationData.searchIteration = 1;
            builder.Prompts.text(session, "What would you like to watch?");
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
                msg = "Need more inspiration?";
            } else {
                msg = "Would you like to see more search results?";
            }
            builder.Prompts.choice(session, msg, ["Yes, please!", "No, thanks."]);
        } else {
            session.beginDialog('/finish');
        }
    },
    function(session, results) {
        if (results.response.entity === "Yes, please!") {
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
        builder.Prompts.choice(session, "Can I do something else for you?", ["Yes, please!", "No, thanks."]);
    },
    function(session, results) {
        if (results.response.entity === "Yes, please!") {
            session.beginDialog('/search');
        } else {
            session.send("Thank you for using our bot. Have a nice day!");
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
        order = GetRandomOrder();
    }
    var opts = {
        maxResults: 3*iteration,
        key: 'AIzaSyD9BFPfl3bq2Z6qaEYd7lzOg4UDQQ9MXIc',
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

                    .buttons([builder.CardAction.openUrl(session, result.link, 'watch')])
                    .images([builder.CardImage.create(session, result.thumbnails.high.url)]);
                attachments.push(card);
            }
            if (results.length === 0) {
                session.conversationData.found = false;
                session.send("Sorry, we didn't find anything.");
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

function GetRandomOrder() {
    var n = Math.random() % 6;
    switch (n) {
        case 0:
            return 'date';
        case 1:
            return 'rating';
        case 2:
            return 'relevance';
        case 3:
            return 'title';
        case 4:
            return 'videoCount';
        case 5:
            return 'viewCount';
        default:
            return 'relevance';
    }
}
