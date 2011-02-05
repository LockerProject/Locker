// present a single page listing all the services discovered in this locker, scanning the /Apps /Collections /Contexts and /SourceSinks dirs
// enable start/stop on all (that you can)

var rootHost = process.argv[2];
var rootPort = process.argv[3];
if (!rootHost || !rootPort)
 {
    process.stderr.write("missing host and port arguments\n");
    process.exit(1);
}
var lockerPort = '1'+rootPort;
var lockerBase = 'http://'+rootHost+':'+lockerPort;

var fs = require('fs'),
    path = require('path'),
    url = require('url'),
    sys = require('sys'),
    express = require('express'),
    connect = require('connect'),
    http = require('http'),
    wwwdude = require('wwwdude'),
    wwwdude_client = wwwdude.createClient({
        encoding: 'utf-8'
    });
    
var app = express.createServer(
                connect.bodyDecoder(),
                connect.cookieDecoder(),
                connect.session({secret : "locker"})
            );

var map;
app.get('/', function (req, res) {    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write('<html><head><title>Locker Dashboard</title>' +
                '<script src="util.js"></script></head>\n\n<body>' +
                '<script src="http://code.jquery.com/jquery-1.4.4.min.js"></script></head>\n\n<body>');
    //res.write('launch <a onclick="javascript:$.get(\'http:localhost:1' + rootPort + '/launchapp\', {name:\'Fizz\'})">Fizz!</a>');
    res.write('Welcome! Reading JSON is fun, right? :) ...requesting map from '+lockerBase+'/map');
    wwwdude_client.get(lockerBase + '/map')
    .addListener('success', function(data, resp) {
        map = JSON.parse(data);
        res.write('<h2>my stuff</h2>');
        if(map.existing) for(var i=0;i<map.existing.length;i++)
        {
            res.write('<li><a href="/open?id='+map.existing[i].id+'">open</a> '+JSON.stringify(map.existing[i]));
        }
        res.write('<h2>available things to install in my locker</h2>');
        if(map.available) for(var i=0;i<map.available.length;i++)
        {
            // just using array offset as unique id for now as shortcut, should be our own id to the "template" to be installed
            res.write('<li><input type="button" onclick="install('+i+')" value="install"> '+JSON.stringify(map.available[i]));
        }
        res.end("</body></html>");
    }).send();
});

app.get('/open', function(req, res){
    wwwdude_client.get(lockerBase + '/open?id='+req.param('id'))
    .addListener('success', function(data, resp) {
        var js = JSON.parse(data);
        res.writeHead(301,{'Location': js.uri});
        res.end();
    }).send();    
});

app.get('/install', function(req, res){
    var httpClient = http.createClient(lockerPort);
    var request = httpClient.request('POST', '/install', {'Content-Type':'application/x-www-form-urlencoded'});
    request.write(JSON.stringify(map.available[req.param('id')]));
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
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write('Installed: '+data);
            res.end();
        });
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

console.log('http://'+rootHost+':'+rootPort+'/');

app.listen(rootPort);