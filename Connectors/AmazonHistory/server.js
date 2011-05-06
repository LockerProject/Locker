/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs'),
    path = require('path'),
    url = require('url'),
    sys = require('sys'),
    express = require('express'),
    connect = require('connect');
    
var app = express.createServer(
                connect.bodyParser(),
                connect.cookieParser(),
                connect.session({secret : "locker"})
            );

var html = require('../../Common/node/html.js');
var format = function(content) {
    return html.formatHTML("Amazon Snapshot", content, ["#3B5998", "white"]); // These colors can be customized later...
};

var resCount=0;
function readJSON(res,file) {
    var data = fs.readFileSync(file, "utf-8");
    var lines = data.split('\n');
    res.write("found "+lines.length+" entries in "+file);
    resCount--;
    
}

app.get('/', function (req, res) {    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(format("to save your amazon purchase history, copy this code first:<br><textarea>javascript:var%20s%20=%20document.createElement(%27script%27);s.src=%27http://localhost:3005/save?html=%27+encodeURIComponent(document.body.innerHTML);document.body.appendChild(s);</textarea><br>then go to your <a href=\"https://www.amazon.com/gp/css/history/orders/view.html/ref=ya_70c\">amazon purchase history page</a>, and paste it into the url bar and hit enter</body></html>"));
});

app.get('/save', function (req, res){
    console.log(req.param('html'));
    res.writeHead(200);
    res.end(format("saving..."));
});

app.get('/*', function (req, res) {
    var uri = url.parse(req.url).pathname;
    var filename = path.join(process.cwd(), uri);  
    path.exists(filename, function(exists) { 
        if(!exists) {  
            res.writeHead(404, {"Content-Type": "text/plain"});  
            res.end(format("404 Not Found\n"));  
            return;  
        }  

        fs.readFile(filename, "binary", function(err, file) {  
            if(err) {  
                res.writeHead(500, {"Content-Type": "text/plain"});  
                res.end(format(err + "\n"));  
                return;  
            }  

            res.writeHead(200);  
            res.write(file, "binary");  
            res.end();  
        });  
    });
});

console.log('Server running at http://127.0.0.1:3005/');

app.listen(3005);
