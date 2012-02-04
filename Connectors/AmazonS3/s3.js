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
    request = require('request'),
    path = require('path'),
    knox = require('knox'),
    app = express.createServer(
                    connect.bodyParser(),
                    connect.cookieParser()),
    locker = require('locker'),
    lfs = require('lfs');

var me;

app.set('views', __dirname);
app.get('/', handleIndex);

var s3=false;
function handleIndex(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    if(s3)
    {
        res.end(fs.readFileSync(__dirname + '/ui/index.html'));
    }else{
        res.end(fs.readFileSync(__dirname + '/ui/init.html'));
    }
}

app.get('/init', function(req, res) {
    if(!req.param('key') || !req.param('secret') || !req.param('bucket') ) {
        res.writeHead(400);
        res.end('whats the creds yo?');
        return;
    }
    console.log("initializing for "+req.param('bucket') );
    s3 = knox.createClient({key:req.param('key'), secret:req.param('secret'), bucket:req.param('bucket')});
    fs.writeFileSync('auth.json', JSON.stringify({key:req.param('key'), secret:req.param('secret'), bucket:req.param('bucket')}));
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end("saved, <a href='./'>continue</a>");        
});

app.get('/save', function(req, res) {
    if(!req.param('file')){
        res.writeHead(400);
        res.end('whats the file yo?');
        return;
    }
    console.log("saving "+req.param('file') );
    res.writeHead(200);
    res.end("ok, background uploading...");
    s3.putFile(req.param('file'), path.basename(req.param('file')), function (err, res) {
        if (err)
            console.log("failed: "+err+" "+res.body);
        else
            console.log("result: "+res.statusCode);
    });
});


var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    me = lfs.loadMeData();
    lfs.readObjectFromFile('auth.json', function(auth) {
        if(auth.key) s3 = knox.createClient({key:auth.key, secret:auth.secret, bucket:auth.bucket});
        app.listen(processInfo.port,function() {
            var returnedInfo = {port: processInfo.port};
            console.log(JSON.stringify(returnedInfo));
        });
    });

});
