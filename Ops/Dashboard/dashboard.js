// present a single page listing all the services discovered in this locker, scanning the /Apps /Collections /Contexts and /SourceSinks dirs
// enable start/stop on all (that you can)

var rootHost = process.argv[2];
var rootPort = process.argv[3];
if (!rootHost || !rootPort)
 {
    process.stderr.write("missing host and port arguments\n");
    process.exit(1);
}
var lockerPort = rootPort.substring(1);
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
    res.writeHead(200, { 'Content-Type': 'text/html','Access-Control-Allow-Origin' : '*' });
    res.write('<html><head><title>Locker Dashboard</title>' +
                '<script src="util.js"></script></head>\n\n<body>' +
                '<script src="http://code.jquery.com/jquery-1.4.4.min.js"></script>' + 
                '<link rel="stylesheet" href="css/style.css" type="text/css"></link></head>\n\n<body>');
    res.write('Welcome! Reading JSON is fun, right? :) ...requesting map from '+lockerBase+'/map');
    wwwdude_client.get(lockerBase + '/map')
    .addListener('success', function(data, resp) {
        map = JSON.parse(data);
        res.write('<h2>my stuff</h2>');
        res.write('<table>');
        res.write('<tr><td>Title</td><td class="desc">Description</td><td>Type</td><td class="action">Action</td>' +
                  '<td>ID</td><td>Run</td><td>Services</td><td>Source Dir</td></tr>');
        if(map.installed) for(var id in map.installed) {
            var item = map.installed[id];
            res.write('<tr>');
            res.write('<td><a href="'+item.uri+'">' + item.title + '</a></td>');
            res.write('<td class="desc">' + item.desc + '</td>');
            res.write('<td>' + item.is + '</td>');
            res.write('<td class="action">' + item.action + '</td>');
            res.write('<td>' + item.id + '</td>');
            res.write('<td>' + item.run + '</td>');
            res.write('<td>' + item.services + '</td>');
            res.write('<td>' + item.srcdir + '</td>');
            res.write('</tr>');
        }
        res.write('</table>');
        res.write('<br><h2>available things to install in my locker</h2>');
        
        res.write('<table>');
        res.write('<tr><td>Title</td><td class="desc">Description</td><td>Type</td><td class="action">Action</td>' + 
                  '<td>Run</td><td>Services</td><td>Source Dir</td></tr>');
        if(map.available) for(var i=0;i<map.available.length;i++) {
            // just using array offset as unique id for now as shortcut, should be our own id to the "template" to be installed
            var item = map.available[i];
            res.write('<tr>');
            res.write('<td><a href="javascript:install('+i+')">' + item.title + '</a></td>');
            res.write('<td class="desc">' + item.desc + '</td>');
            res.write('<td>' + item.is + '</td>');
            res.write('<td class="action">' + item.action + '</td>');
            res.write('<td>' + item.run + '</td>');
            res.write('<td>' + item.provides + '</td>');
            res.write('<td>' + item.srcdir + '</td>');
            res.write('</tr>');
        }
        res.write('</table>');
        res.end("</body></html>");
    });
});

// doesn't this exist somewhere? was easier to write than find out, meh!
function intersect(a,b)
{
    if(!a || !b) return false;
    for(var i=0;i<a.length;i++)
    {
        for(var j=0;j<b.length;j++)
        {
            if(a[i] == b[j]) return a[i];
        }
    }
    return false;
}

app.get('/post2install', function(req, res){
    var id = parseInt(req.param('id'));
    var js = map.available[id];
    // if this service being installed depends on another service, present a list before installing
    if (js.takes)
    {
        if (!req.param('use'))
        {
            var opts = [];
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write('Please select one of the following to be used:' +
                      '<form method="get"><input type="hidden" name="id" value="'+id+'"><select name="use" rows="5" multiple="1">');
            for (key in map.installed) {
                if (!map.installed.hasOwnProperty(key)) continue;
                var e = map.installed[key];
                console.log(e);
                if(intersect(e.provides,js.takes)) res.write('<option value="'+e.id+'">'+e.title+'</option>');
            };
            res.write('<input type="submit" value="install"></form>');
            res.write('<br>You may also need to install one of these:<ul>');
            map.available.forEach(function(svc) {
                if(intersect(svc.provides,js.takes)) res.write('<li>'+svc.title+"</li>");
            });
            res.end();
            return;
        } else {
            var use = req.param("use");
            js.use = {};
            // teh lame!!
            if (typeof use == 'object')
            {
                for(var i=0;i<use.length;i++) js.use[use[i]] = intersect(js.takes,map.installed[use[i]].provides);
            } else {
                js.use[use] = intersect(js.takes,map.installed[use].provides);
            }
        }
    }
    var httpClient = http.createClient(lockerPort);
    var request = httpClient.request('POST', '/install', {'Content-Type':'application/x-www-form-urlencoded'});
    request.write(JSON.stringify(map.available[req.param('id')]));
    request.end();
    console.log(request);
    request.on('response',
    function(response) {
        var data = '';
        response.on('data', function(chunk) {
            data += chunk;
        });
        response.on('end', function() {
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
