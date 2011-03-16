/**
 * Module dependencies.
 */
require.paths.push(__dirname + "/Common/node");

var fs = require('fs');
var express = require('express'),
    connect = require('connect'),
    lfs = require('../../Common/node/lfs.js'),
    app = express.createServer(
        connect.bodyDecoder(),
        connect.cookieDecoder(),
        connect.session({secret : "locker"}));

var me, latests;    

app.get('/', 
function(req, res) {
    console.log('chrome /');
    res.end("hello chrome");
});

app.post('/urls',
function(req, res) {
    console.log('/urls');
    var stream = fs.createWriteStream('history.json');
    console.log('body: ' + JSON.stringify(req.body));
    var json = JSON.parse(req.body.urls);
    console.log('urls: ' + json);
    for(var i = 0; i <  json.length; i++) {
        stream.write(JSON.stringify(json[i]) + '\n');
    }
    latests.latest = json[0];
    latests.oldest = json[json.length - 1];
    lfs.writeObjectToFile('latests.json', latests);
    stream.end();
    res.end('1');
});

app.get('/latest', 
function(req, res) {
    console.log('/latest');
    res.end(JSON.stringify(latests.latest));
});


var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    process.chdir(processInfo.workingDirectory);
    lfs.readObjectFromFile('latests.json', function(newLatests) {
        latests = newLatests;
        me = lfs.loadMeData();
        app.listen(processInfo.port);
        var returnedInfo = {port: processInfo.port};
        console.log(JSON.stringify(returnedInfo));
    });
});