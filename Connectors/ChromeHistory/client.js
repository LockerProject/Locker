/**
 * Module dependencies.
 */
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

app.post('/urls',
function(req, res) {
    var stream = fs.createWriteStream('history.json');
    var json = JSON.parse(req.body.urls);
    for(var i = 0; i <  json.length; i++) {
        stream.write(JSON.stringify(json[i]) + '\n');
    }
    me.latest = json[0];
    me.oldest = json[json.length - 1];
    lfs.
    stream.end();
});

app.get('/latest', 
function(req, res) {
    
});


console.log("server running at http://localhost:" + port + "/");
app.listen(port);
