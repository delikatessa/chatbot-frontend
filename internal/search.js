var builder = require('botbuilder');
var Talk = require('../classes/talk')
var text = require("./text.json");
var utils = require('./utils')
var youtube = require('youtube-search');

var MAX_RESULTS = 5;

exports.search = function(session, callback){
    var order;
    if (session.conversationData.inspire) {
        var orders = ['date', 'rating', 'relevance', 'title', 'videoCount', 'viewCount'];
        order = orders[utils.Random(0, 5)];
        session.conversationData.maxResults = utils.Random(MAX_RESULTS, 50);
    } else {
        order = 'relevance';
        session.conversationData.maxResults = MAX_RESULTS * session.conversationData.inspireIteration % 500;
    }
    var opts = {
        maxResults: session.conversationData.maxResults,
        key: 'AIzaSyDkQmf5kACDxIzQIpRrBjMYY9rjH9rPngs',
        part: 'snippet',
        order: order,
        chart: 'mostPopular',        
        type: 'video',
        relevanceLanguage: 'en'
    };
    searchTEDxTalks(session, opts, callback);
};

function searchTEDxTalks(session, opts, callback) {
    opts.channelId = 'UCsT0YIqwnpJCM-mx7-gSA4Q';
    youtube(session.conversationData.searchTerm, opts, function (err, results) {
        if (err) {            
            throw err;
        }        
        processSearchResults(session, results, callback);
    });
}

function processSearchResults(session, results, callback) {
    if (results) {
        var talks = [];
        for (var i = 0; i < results.length; i++) {
            var result = results[i];
            var talk = new Talk(result);
            talks.push(talk)
        }
        if (session.conversationData.inspire) {
            var results2 = [];
            var idxs = [];
            while (results2.length < MAX_RESULTS) {
                var idx = utils.Random(1, session.conversationData.maxResults) - 1;
                if (idxs.indexOf(idx) === -1) {
                    results2.push(results[idx]);
                    idxs.push(idx);
                }
            }
            results = results2;
        } else {
            var iteration = session.conversationData.inspireIteration;
            if (iteration > 1 && results.length > MAX_RESULTS * (iteration - 1)) {
                results = results.slice(MAX_RESULTS * (iteration - 1));
            }
        }
        var attachments = [];
        var btnTitle = utils.getText(text.search.watch);
        for (var i = 0; i < results.length; i++) {
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
        callback(talks);
    }
}