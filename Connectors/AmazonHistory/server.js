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


var resCount=0;
function readJSON(res,file) {
    var data = fs.readFileSync(file, "utf8");
    var lines = data.split('\n');
    res.write("found "+lines.length+" entries in "+file);
    resCount--;
    
}

app.get('/', function (req, res) {    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write('<html><head><title>Amazon Snapshot</title></head>\n\n<body>');
    res.write('to save your amazon purchase history, copy this code first:<br><textarea>');
    res.write('javascript:var%20s%20=%20document.createElement(%27script%27);s.src=%27http://localhost:3005/save?html=%27+encodeURIComponent(document.body.innerHTML);document.body.appendChild(s);');
    res.write('</textarea><br>then go to your <a href="https://www.amazon.com/gp/css/history/orders/view.html/ref=ya_70c">amazon purchase history page</a>, and paste it into the url bar and hit enter');
    res.end("</body></html>");
});

app.get('/save', function (req, res){
    console.log(req.param('html'));
    res.writeHead(200);
    res.end();
});

app.get('/*', function (req, res) {
    var uri = url.parse(req.url).pathname;
    var filename = path.join(process.cwd(), uri);  
    path.exists(filename, function(exists) { 
        if(!exists) {  
            res.writeHead(404, {"Content-Type": "text/plain"});  
            res.write("404 Not Found\n");  
            res.end();  
            return;  
        }  

        fs.readFile(filename, "binary", function(err, file) {  
            if(err) {  
                res.writeHead(500, {"Content-Type": "text/plain"});  
                res.write(err + "\n");  
                res.end();  
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
