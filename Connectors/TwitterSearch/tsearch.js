/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

/**
 * web server/service to wrap interactions w/ GitHub API
 */

var fs = require('fs'),
    url = require('url'),
    express = require('express'),
    connect = require('connect'),
    sys = require('sys'),
    app = express.createServer(
                    connect.bodyParser(),
                    connect.cookieParser()),
    locker = require('../../Common/node/locker.js'),
    lfs = require('../../Common/node/lfs.js');

var ts = require('./sync.js');

var me;

app.set('views', __dirname);
app.get('/', handleIndex);

function handleIndex(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(fs.readFileSync(__dirname + '/ui/index.html'));
}

app.get('/snap', function(req, res) {
    var query = req.param('query');
    if(!query || query.length == 0) {
        res.writeHead(400);
        res.end('whats the query yo?');
        return;
    }
    console.log("creating new search sync from: "+query);
    ts.createClient(query, function(search){
        search.syncSearch(function(data){
            res.writeHead(200);
            res.end("got "+data.length+" tweets");
        });
    });
});


var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    me = lfs.loadMeData();
    app.listen(processInfo.port,function() {
        var returnedInfo = {port: processInfo.port};
        console.log(JSON.stringify(returnedInfo));
    });
});
