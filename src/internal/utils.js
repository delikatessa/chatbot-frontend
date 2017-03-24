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
    let ret;
    if (string instanceof Array) {
        ret = string.join('|');
    } else {
        ret = string;
    }
    if (typeof session != 'undefined' && ret.indexOf("{user}") != -1) {
        let userName;
        if (session.userData.user === undefined || session.userData.user.first_name === null || session.userData.user.first_name === undefined) {
            userName = session.message.user.name.match(/([^\s]+)/i)[0];
        } else {
            userName = session.userData.user.first_name;
        }
        ret = ret.replace(/{user}/g, userName);
    }
    if (ret.indexOf(":") != -1) {
        const emoticons = ret.match(/:\w+:/ig);
        for (emoticon of emoticons) {
            let code = text.emoticons[emoticon.replace(/:/g, '')];
            if (code === undefined) {
                code = '';
            }
            ret = ret.replace(emoticon, code);
        }
    }
    if (string instanceof Array) {
        return ret.split('|');
    } else {
        return ret;
    }
}

function sendQuickRepliesMessage(session, msg, replies) {
    const replyMessage = new builder.Message(session).text(msg);
    const quickReplies = [];
    for (reply in replies) {
        quickReplies.push({
            content_type: "text",
            title: reply,
            payload: reply
        });
    }
    replyMessage.sourceEvent({ 
        facebook: { 
            quick_replies: quickReplies
         }
    });
    builder.Prompts.text(session, replyMessage);
}

function textContains(input, words) {
    input = input.toLowerCase();
    for (let word of words) {
        if (input.indexOf(word) != -1) {
            return true;
        }
    }
    return false;
}

const retryPrompts = [];
function sendRetryPrompt(session) {
    if (typeof retryPrompts === 'undefined') {
        retryPrompts = getText(text.retryPrompts);    
    }
    const i = random(0, retryPrompts.length - 1);
    session.send(retryPrompts[i]);
    session.sendTyping();
}

function sendHelpMessage(session, choices) {
    const msg = getText(text.common.help, session).replace(/{choices}/g, getText(choices).join(" or "));
    session.send(msg);
    session.sendTyping();
}