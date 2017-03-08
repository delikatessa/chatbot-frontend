var builder = require('botbuilder');
var text = require("../resources/text.json");

module.exports = {
    random: random,
    getText: getText,
    sendQuickRepliesMessage: sendQuickRepliesMessage,
    textContains: textContains,
    sendRetryPrompt: sendRetryPrompt,
    sendHelpMessage: sendHelpMessage
}

function random(low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}

function getText(string, session) {
    var ret;
    if (string instanceof Array) {
        ret = string.join('|');
    } else {
        ret = string;
    }
    if (typeof session != 'undefined' && ret.indexOf("{user}") != -1) {
        var userName;
        if (session.userData.user === undefined || session.userData.user.first_name === null) {
            userName = session.message.user.name.match(/([^\s]+)/i)[0];
        } else {
            userName = session.userData.user.first_name;
        }
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

function textContains(input, words) {
    input = input.toLowerCase();
    for (var i = 0; i < words.length; ++i) {
        if (input.indexOf(words[i]) != -1) {
            return true;
        }
    }
    return false;
}

var retryPrompts;
function sendRetryPrompt(session) {
    if (typeof retryPrompts === 'undefined') {
        retryPrompts = parseText(text.retryPrompts);    
    }
    var i = Random(0, retryPrompts.length - 1);
    session.send(retryPrompts[i]);
    session.sendTyping();
}

function sendHelpMessage(session, choices) {
    var msg = parseText(text.common.help, session).replace(/{choices}/g, parseText(choices).join(" or "));
    session.send(msg);
    session.sendTyping();
}