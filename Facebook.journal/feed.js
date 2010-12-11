var userID = process.argv[2];
if (!userID) {
    console.log("node feed.js userID");
    process.exit(1);
}

var fs = require('fs');
var http = require('http');

var stream;
fs.readFile("access.token", "utf-8", function(err, token) {
    if (err)
    {
        console.log("missing access.token :(");
        process.exit(1);
    }
    console.log("loaded token " + JSON.stringify(token));
    stream = fs.createWriteStream('my/' + userID + '/feed.json');
    homer('https://graph.facebook.com/'+userID+'/home?access_token='+ token);
});


var cnt=0;
function homer(url)
{
    console.log(cnt++ + "\t" + url);
    var parts = url.match(/https\:\/\/([^\/]+)(\/.+)/);
    get(parts[1],parts[2],function(data){
        var js = JSON.parse(data);
        if(js && js.data && js.data.length > 0)
        {
            console.log(js.data.length + " items");
            for(var i=0;i<js.data.length;i++)
            {
                stream.write(JSON.stringify(js.data[i]) + "\n");
            }
            homer(js.paging.next);
        }else{
            console.log("done");
            stream.end();
        }
    });
}

function get(host, url, callback) {
    var httpClient = http.createClient(443, host, true);
    var request = httpClient.request('GET', url, {
        host: host
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
