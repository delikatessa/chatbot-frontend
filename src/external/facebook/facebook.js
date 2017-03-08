//http://stackoverflow.com/questions/13108995/how-to-get-facebook-friends-from-facebook-api-with-node-js
//http://stackoverflow.com/questions/13108995/how-to-get-facebook-friends-from-facebook-api-with-node-js

//var https = require('https');

//exports.getUserPublicProfile = function(userId, callback) {
//    var options = {
//        host: 'graph.facebook.com',
//        port: 443,
//        path: '/v2.6/' + userId + '?fields=first_name,locale,timezone,gender&access_token=' + process.env.FB_PAGE_ACCESS_TOKEN,
//        method: 'GET'
//    };

//    var buffer = ''; //this buffer will be populated with the chunks of the data received from facebook
//    var request = https.get(options, function(result){
//        result.setEncoding('utf8');
//        result.on('data', function(chunk){
//            buffer += chunk;
//        });

//        result.on('end', function(){
//            callback(buffer);
//        });
//    });

//    request.on('error', function(e){
//        console.log('error from facebook.getFbData: ' + e.message)
//    });

//    request.end();
//}