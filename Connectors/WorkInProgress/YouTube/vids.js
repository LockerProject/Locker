/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

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

function save(file, data) {
    var js = JSON.parse(data);
    fs.mkdir('my',0755);
    stream = fs.createWriteStream('my/'+file+'.json');
    console.log("saving "+file+" metadata about "+js.feed.entry.length+" vids");
    for(var i=0;i<js.feed.entry.length;i++)
    {
        stream.write(JSON.stringify(js.feed.entry[i]) + "\n");
    }
    stream.end();
};

fs.readFile("auth.token", "utf8",
function(err, token) {
    console.log("loaded token " + token);
    get('gdata.youtube.com', '/feeds/api/users/default/uploads?alt=json&v=2', token,function(data){save('videos',data);});
    get('gdata.youtube.com', '/feeds/api/users/default/subscriptions?alt=json&v=2', token,function(data){save('subscriptions',data);});
    get('gdata.youtube.com', '/feeds/api/users/default/newsubscriptionvideos?alt=json&v=2', token,function(data){save('newsubscriptionvideos',data);});
});
