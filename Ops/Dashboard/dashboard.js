// present a single page listing all the services discovered in this locker, scanning the /Apps /Collections /Contexts and /SourceSinks dirs
// enable start/stop on all (that you can)

var rootHost = process.argv[2];
var rootPort = process.argv[3];
if (!rootHost || !rootPort)
 {
    process.stderr.write("missing host and port arguments\n");
    process.exit(1);
}

var fs = require('fs'),
    path = require('path'),
    url = require('url'),
    sys = require('sys'),
    express = require('express'),
    connect = require('connect');
    
var app = express.createServer(
                connect.bodyDecoder(),
                connect.cookieDecoder(),
                connect.session()
            );


var resCount=0;
function readJSON(res,file) {
    var data = fs.readFileSync(file, "utf-8");
    var lines = data.split('\n');
    res.write("found "+lines.length+" entries in "+file);
    resCount--;
    
}

app.get('/', function (req, res) {    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write('<html><head><title>Locker Dashboard</title>' +
                '<script src="http://code.jquery.com/jquery-1.4.4.min.js"></script></head>\n\n<body>');
    //res.write('launch <a onclick="javascript:$.get(\'http:localhost:1' + rootPort + '/launchapp\', {name:\'Fizz\'})">Fizz!</a>');
    
    res.end("</body></html>");
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

console.log('http://'+rootHost+':'+rootPort+'/');

app.listen(rootPort);