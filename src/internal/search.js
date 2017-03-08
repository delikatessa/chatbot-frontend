var builder = require('botbuilder');
var Talk = require('../classes/talk')
var text = require("./text.json");
var utils = require('./utils')
var youtube = require('youtube-search');
var settings = require('./settings.json');

module.exports = {
    search: search,
    sendResults: sendResults
}

function search(session, callback){
    var order;
    if (session.conversationData.inspire) {
        var orders = ['date', 'rating', 'relevance', 'title', 'videoCount', 'viewCount'];
        order = orders[utils.random(0, 5)];
    } else {
        order = 'relevance';
    }
    var opts = {
        maxResults: 50,
        key: "AIzaSyDkQmf5kACDxIzQIpRrBjMYY9rjH9rPngs",
        part: 'snippet',
        order: order,
        chart: 'mostPopular',
        type: 'video',
        relevanceLanguage: 'en'
    };
    searchTEDxTalks(session, opts, callback);
};

function searchTEDxTalks(session, opts, callback) {
    opts.channelId = settings.YOUTUBE_TEDXTALKS_CHANNEL_ID;
    youtube(session.conversationData.searchTerm, opts, function (error, results) {
        if (error) {
            console.log("ERROR:", error.message || error);            
        }
        processSearchResults(session, results, callback);
    });
}

function processSearchResults(session, results, callback) {
    var allTalks = [];
    for (var i = 0; i < results.length; i++) {
        allTalks.push(new Talk(results[i]));
    }
    var num = Math.min(settings.SEARCH_RESULTS_NUMBER, allTalks.length);
    var talks = [];
    if (session.conversationData.inspire) {
        session.conversationData.inspireResults = allTalks.slice();
        var n = allTalks.length;
        for (var i = 0; i < num; i++, n--) {
            var j = utils.random(0, n - 1);
            talks.push(allTalks[j]);
            session.conversationData.inspireResults.splice(j, 1);
        }        
    } else {
        session.userData.searchResults = allTalks.slice();
        talks = session.conversationData.searchResults.slice(0, num);
        session.conversationData.searchResults.splice(0, num);
    }
    sendResults(session, talks);
    callback(allTalks);
}

function sendResults(session, talks) {
    var attachments = [];
    for (var i = 0; i < talks.length; i++) {
        var talk = talks[i];
        var card = new builder.ThumbnailCard(session)
            .title(talk.title)
            .tap(builder.CardAction.openUrl(session, talk.url))
            .buttons([builder.CardAction.openUrl(session, talk.url, text.search.watch)])
            .images([builder.CardImage.create(session, talk.thumbnail_url)]);
        attachments.push(card);
    }
    if (talks.length === 0) {
        session.send(utils.getText(text.error.noSearchResults, session));
        session.conversationData.found = false;
    } else {
        session.conversationData.found = true;
        var reply = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments(attachments);
        session.send(reply);
    }
}