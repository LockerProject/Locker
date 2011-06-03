/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

// Links from all sources
var http = require('http'),
    url = require('url'),
    lfs = require('../../Common/node/lfs.js');


var lockerInfo;


var express = require('express'),connect = require('connect');
var app = express.createServer(connect.bodyParser(), connect.cookieParser(), connect.session({secret : "locker"}));

// Process the startup JSON object
process.stdin.resume();
process.stdin.on("data", function(data) {
    lockerInfo = JSON.parse(data);
    if (!lockerInfo || !lockerInfo["workingDirectory"]) {
        process.stderr.write("Was not passed valid startup information."+data+"\n");
        process.exit(1);
    }
    process.chdir(lockerInfo.workingDirectory);
    app.listen(lockerInfo.port, "localhost", function() {
        process.stdout.write(data);
        gatherLinks();
    });
});

app.set('views', __dirname);

app.get('/', function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    lfs.readObjectsFromFile("links.json",function(links){
        res.write("<html><p>Found "+links.length+" links: <ul>");
        for(var i in links)
            res.write('<li>'+JSON.stringify(links[i])+"</li>");
        res.write("</ul></p></html>");
        res.end();
    });
});

app.get("/allLinks", function(req, res) {
    res.writeHead(200, {
        "Content-Type":"text/javascript"
    });
    lfs.readObjectsFromFile('links.json', function(links) {
        res.write(JSON.stringify(links));
        res.end();
    });
});

app.get("/update", function(req, res) {
    gatherLinks();
    res.writeHead(200);
    res.end("Updating");
});

function gatherLinks(){
    // This should really be timered, triggered, something else
    var me = lfs.loadMeData();
    for(var conn in me.use)
        addLinksFromConn(conn,'/allLinks',me.use[conn]);
}

var debug = false;

/**
 * Reads in a file (at path), splits by line, and parses each line as JSON.
 * return parsed objects in an array
 */
function parseLinesOfJSON(data) {
    var objects = [];
    var cs = data.split("\n");
    for (var i = 0; i < cs.length; i++) {
        if (cs[i].substr(0, 1) != "{") continue;
        if(debug) console.log(cs[i]);
        objects.push(JSON.parse(cs[i]));
    }
    return objects;
}

function addLinksFromConn(conn, path, type) {
    var puri = url.parse(lockerInfo.lockerUrl);
    var httpClient = http.createClient(puri.port);
    var request = httpClient.request('GET', '/Me/'+conn+path);
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
            var lnks = JSON.parse(data);
            var links = [];
            for (var i in lnks) {
                lnks[i]["_via"] = [conn];
                links.push(lnks[i]);
            }
            lfs.writeObjectsToFile('links.json', links);
        });
    });
}
