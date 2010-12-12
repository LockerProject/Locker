var fs = require('fs');
var http = require('http');


function get(host, url, token, callback) {
    var httpClient = http.createClient(80, host, true);
    var request = httpClient.request('GET', url, {
        host: host,
        'Authorization':'GoogleLogin auth='+token
    });
    request.end();
    request.on('response',
    function(response) {
        var data = '';
        response.on('data',
        function(chunk) {
            data += chunk;
        });
        response.on('end',
        function() {
            callback(data);
        });
    });
}

// curl "http://gdata.youtube.com/feeds/api/users/default/uploads?alt=json&v=2" --header 'Authorization: GoogleLogin auth=PzgWvEBx...I83qvkHJjYYha_A' > qjyoutube2.js

fs.readFile("auth.token", "utf-8", function(err, token) {
    console.log("loaded token " + token);
    get('gdata.youtube.com','/feeds/api/users/default/uploads?alt=json&v=2',token,function(data){
        console.log(data);
    });
});
