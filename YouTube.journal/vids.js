var fs = require('fs');
var http = require('http');


function get(host, url, token, callback) {
    var httpClient = http.createClient(80, host);
    var request = httpClient.request('GET', url, {
        host: host,
        'Connection': 'close',
        'Authorization': 'GoogleLogin auth=' + token
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
fs.readFile("auth.token", "utf-8",
function(err, token) {
    console.log("loaded token " + token);
    get('gdata.youtube.com', '/feeds/api/users/default/uploads?alt=json&v=2', token,
    function(data) {
        var js = JSON.parse(data);
        fs.mkdir('my',0755);
        stream = fs.createWriteStream('my/videos.json');
        console.log("saving metadata about "+js.feed.entry.length+" vids");
        for(var i=0;i<js.feed.entry.length;i++)
        {
            stream.write(JSON.stringify(js.feed.entry[i]) + "\n");
        }
        stream.end();
    });
});
