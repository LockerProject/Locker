/**
 * Module dependencies.
 */

var fs = require('fs');
var express = require('express'),
connect = require('connect'),
app = express.createServer(
    connect.bodyDecoder(),
    connect.cookieDecoder(),
    connect.session({secret : "locker"}));

app.post('/urls',
    function(req, res) {
        fs.mkdir('my', 0755);
        var stream = fs.createWriteStream('my/history.json');
        var json = JSON.parse(req.body.urls);
        for(var i = 0; i <  json.length; i++) {
            stream.write(JSON.stringify(json[i]) + '\n');
        }
        stream.end();
    });


console.log("server running at http://localhost:3005/");
app.listen(3005);
