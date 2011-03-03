/**
 * Module dependencies.
 */
require.paths.push(__dirname + "/Common/node");

var cwd = process.argv[2];
var port = process.argv[3];
if (!cwd || !port) {
    process.stderr.write("missing dir and port arguments\n");
    process.exit(1);
}
process.chdir(cwd);

var fs = require('fs');
var express = require('express'),
    connect = require('connect'),
    lfs = require('../../Common/node/lfs.js'),
    app = express.createServer(
        connect.bodyDecoder(),
        connect.cookieDecoder(),
        connect.session({secret : "locker"}));

var me = lfs.loadMeData();

app.get('/', 
function(req, res) {
    console.log('chrome /');
    res.writeHead(200, {
        "Access-Control-Allow-Origin": "*"
    });
    res.end("hello chrome");
});

app.post('/urls',
function(req, res) {
    console.log('/urls');
    var stream = fs.createWriteStream('history.json');
    var json = JSON.parse(req.body.urls);
    for(var i = 0; i <  json.length; i++) {
        stream.write(JSON.stringify(json[i]) + '\n');
    }
    me.latest = json[0];
    me.oldest = json[json.length - 1];
    lfs.syncMeData(me);
    stream.end();
    res.writeHead(200, {
        "Access-Control-Allow-Origin": "*"
    });
    res.end('1');
});

app.get('/latest', 
function(req, res) {
    console.log('/latest');
    res.writeHead(200, {
        "Access-Control-Allow-Origin": "*"
    });
    res.end(me.latest);
});


console.log("http://localhost:" + port + "/");
app.listen(port);
