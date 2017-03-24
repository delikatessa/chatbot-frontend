var builder = require('botbuilder');
var text = require("../resources/text.json");

module.exports = {
    random: random,
    getText: getText,
    sendQuickRepliesMessage: sendQuickRepliesMessage,
    textContains: textContains,
    dialogRetry: dialogRetry
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
    const emoticons = ret.match(/:\w+:/ig);
    if (emoticons !== null) {
        for (let emoticon of emoticons) {
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

function sendQuickRepliesMessage(session, text, replies) {
    let msg = new builder.Message(session);
    if (session.message.source === "facebook") {
        const quickReplies = [];
        for (let reply of replies) {
            quickReplies.push({
                content_type: "text",
                title: getText(reply.value),
                payload: reply.payload
            });
        }
        const card = {
            facebook: {
                quick_replies: quickReplies
            }
        };
        msg.text(text).sourceEvent(card);
    } else {        
        const choice = getTextChoice(replies);        
        msg.text(text + "\n" + choice);
    }    
    builder.Prompts.text(session, msg);
}

function getTextChoice(replies) {
    let choices = [];
    for (let reply of replies) {
        choices.push(reply.index + ". " + getText(reply.value));
    }
    return choices.join(" | ");
}

function textContains(input, words, index) {
    input = input.toLowerCase();
    words.push(index.toString());
    for (let word of words) {
        if (input.indexOf(word) != -1) {
            return true;
        }
    }
    return false;
}

let retryPrompts = [];
function dialogRetry(session, replies, dialog) {
    if (retryPrompts.length === 0) {
        retryPrompts = getText(text.retry.prompts);
    }
    const retry = retryPrompts[random(0, retryPrompts.length - 1)];
    msg = retry;
    if (session.message.source === "facebook") {
        const choice = getTextChoice(replies);
        const i = random(0, text.retry.options.length - 1);
        const options = getText(text.retry.options[i])
        msg += " " + getText(text.retry.facebook) + "\n\n" + choice;
    }
    
    session.send(msg);
    session.sendTyping();
    session.replaceDialog(dialog, { reprompt: false });
}