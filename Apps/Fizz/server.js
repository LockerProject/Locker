var sys = require("sys"),  
    http = require("http"),  
    url = require("url"),  
    path = require("path"),  
    fs = require("fs");  

var express = require('express');

var app = express.createServer();

var wwwdude = require('wwwdude');
var wwwdude_client = wwwdude.createClient({
    encoding: 'utf-8'
});

app.get('/getfeed', function(req, res){
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    wwwdude_client.get('http://localhost:3003/getfeed')
    .addListener('success', function(data, resp) {
        res.write(data);
        res.end();
    }).send();
});

app.get('/', function(req, res) {
    serveFile(path.join(process.cwd(), '/index.html'), res);
});

app.get('/*', function(req, res) {
    var uri = url.parse(req.url).pathname;  
    var filename = path.join(process.cwd(), uri);  
    serveFile(filename, res);
});

function serveFile(filename, response) {
    path.exists(filename, function(exists) {  
        if(!exists) {
            response.writeHead(404, {"Content-Type": "text/plain"});  
            response.write("404 Not Found\n");  
            response.end();  
            return;  
        }  

        fs.readFile(filename, "binary", function(err, file) {  
            if(err) {  
                response.writeHead(500, {"Content-Type": "text/plain"});  
                response.write(err + "\n");  
                response.end();  
                return;  
            }  

            response.writeHead(200);  
            response.write(file, "binary");  
            response.end();  
        });  
    });
}


app.listen(3000);
sys.puts("Server running at http://localhost:3000/");