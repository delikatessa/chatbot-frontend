var builder = require('botbuilder');
var Talk = require('../classes/talk')
var text = require("../resources/text.json");
var utils = require('./utils')
var youtube = require('youtube-search');
var settings = require('../resources/settings.json');

module.exports = {
    search: search,
    sendResults: sendResults
}

function search(session, callback){
    let order;
    if (session.conversationData.inspire) {
        const orders = ['date', 'rating', 'relevance', 'title', 'videoCount', 'viewCount'];
        order = orders[utils.random(0, 5)];
    } else {
        order = 'relevance';
    }
    const opts = {
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
    opts.channelId = settings.YOUTUBE_CHANNEL_1;
    youtube(session.conversationData.searchTerm, opts, function(error, results) {
        if (error) {
            console.log("ERROR.Youtube:", error.message || error);
        } else {
            processSearchResults(session, results, callback);
        }
    });
}

function processSearchResults(session, results, callback) {
    const allTalks = [];
    for (let result of results) {
        allTalks.push(new Talk(result));
    }
    let num = Math.min(settings.SEARCH_RESULTS_NUMBER, allTalks.length);
    let talks = [];
    if (session.conversationData.inspire) {        
        for (let i = 0; i < num; i++) {
            let j = utils.random(0, allTalks.length - 1);
            talks.push(allTalks[j]);
            allTalks.splice(j, 1);
        }
        session.conversationData.inspireTalks = allTalks;
    } else {
        talks = allTalks.slice(0, num);
        allTalks.splice(0, num);
        session.conversationData.searchTalks = allTalks;
    }
    sendResults(session, talks);
    callback();
}

function sendResults(session, talks) {
    if (talks.length === 0) {
        session.send(utils.getText(text.error.noSearchResults, session));
        session.conversationData.found = false;
    } else {
        session.conversationData.found = true;

        //var attachments = [];
        let elements = [];
        for (let talk of talks) {
            //var card = new builder.ThumbnailCard(session)
            //    .title(talk.title())
            //    .subtitle(talk.author() + ", " + talk.event())
            //    .tap(builder.CardAction.openUrl(session, talk.url))
            //    .buttons([builder.CardAction.openUrl(session, talk.url, text.search.watch)])
            //attachments.push(card);

            const element = {
                title: talk.title,
                subtitle: talk.author + ", " + talk.event,
                image_url: talk.thumbnail_url,
                buttons: [{
                    type: "web_url",
                    url: talk.url,
                    title: text.search.watch,
                    webview_height_ratio: "compact"
                }]
            };
            elements.push(element);
        }
        //var reply = new builder.Message(session)
        //    .attachmentLayout(builder.AttachmentLayout.carousel)
        //    .attachments(attachments);
        //session.send(reply);

        const card = {
            facebook: {
                attachment: {
                    type: "template",
                    image_aspect_ratio: "square",
                    payload: {
                        template_type: "generic",
                        elements: elements
                    }
                }
            }
        };
        const msg = new builder.Message(session).sourceEvent(card);
        session.send(msg);
    }
}