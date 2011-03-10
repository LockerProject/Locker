/**
 * Module dependencies.
 */

var cwd = process.argv[2];
var port = process.argv[3];
if (!cwd || !port) // Z stat dir
{
    process.stderr.write("missing dir and port arguments\n");
    process.exit(1);
}

process.chdir(cwd);

var fs = require('fs'),http = require('http');
var express = require('express'),connect = require('connect');
var app = express.createServer(connect.bodyDecoder(), connect.cookieDecoder(), connect.session({secret : "locker"}));

app.set('views', "../../Docs");

app.get('/',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    fs.readFile("index.html", "binary", function(err, file) {  
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

app.listen(port);
console.log("http://localhost:"+port+"/");
