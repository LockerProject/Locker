/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

/**
 * simple util connector to archive tweets via search.twitter.com's api, handy!
 */

var fs = require('fs'),
    url = require('url'),
    express = require('express'),
    connect = require('connect'),
    sys = require('sys'),
    async = require('async'),
    app = express.createServer(
                    connect.bodyParser(),
                    connect.cookieParser()),
    locker = require('locker'),
    lfs = require('lfs');

var ts = require('./sync.js');

var me;

app.set('views', __dirname);
app.get('/', handleIndex);

function searchScan(callback) {
    var searches = {};
    var files = fs.readdirSync(".");
    async.forEach(files,function(file){
        if(RegExp("\\.search$").test(file,cb))
        {
            lfs.readObjectFromFile(files[i],function(data){
                if(data && data.id) searches[data.id] = data;
                cb();
            });
        }else{
            cb();
        }
    },function(err){
        callback(searches);
    });
}

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
            locker.diary("got "+data.length+" tweets for "+query);
            locker.at("/snap?query="+query,3600);
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
