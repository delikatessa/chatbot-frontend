var https = require('https');
var settings = require('../resources/settings.json');

exports.getUserPublicProfile = function(id, callback) {
    const options = {
        host: 'graph.facebook.com',
        port: 443,
        path: '/v' + process.env.GRAPH_API_VERSION + '/' + id + '?access_token=' + process.env.FB_PAGE_ACCESS_TOKEN,
        method: 'GET'
    };

    let buffer = ''; //this buffer will be populated with the chunks of the data received from facebook
    const request = https.get(options, function(result) {
        result.setEncoding('utf8');
        result.on('data', function(chunk) {
            buffer += chunk;
        });

        result.on('end', function() {
            callback(buffer);
        });
    });

    request.on('error', function(error) {
        console.log("ERROR.Facebook:", error.message || error);
    });

    request.end();
}