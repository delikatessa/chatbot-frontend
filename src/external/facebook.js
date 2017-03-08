var https = require('https');
var settings = require('../resources/settings.json');

exports.getUserPublicProfile = function (id, callback) {
    var accessToken = 'EAAMLZBCmXSSkBAH4BMZCH4E8Du6i5v2matZBcrDxB58jDbEAYKsaAlRRRjOR6F2XISnZAKfcbtl9bEdHLesEQaIk1b3akjG8lwsbc60BFuvlFCyKayFdxhFxo4wZAZBWX69e3uhMwL02FKRdWyZCBvMZAKuCrxpBPTmW1uzir79qkgZDZD';

    var options = {
        host: 'graph.facebook.com',
        port: 443,
        path: '/v' + settings.GRAPH_API_PATH_VERSION + '/' + id + '?access_token=' + accessToken,
        method: 'GET'
    };

    var buffer = ''; //this buffer will be populated with the chunks of the data received from facebook
    var request = https.get(options, function(result){
        result.setEncoding('utf8');
        result.on('data', function(chunk){
            buffer += chunk;
        });

        result.on('end', function(){
            callback(buffer);
        });
    });

    request.on('error', function(e){
        console.log('error from facebook.getFbData: ' + e.message)
    });

    request.end();
}