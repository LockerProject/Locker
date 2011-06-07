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
    sys = require('sys'),
    dbox = require('dropbox').DropboxClient,
    app = express.createServer(
                    connect.bodyParser(),
                    connect.cookieParser()),
    locker = require('../../Common/node/locker.js'),
    lfs = require('../../Common/node/lfs.js');

var me;

app.set('views', __dirname);
app.get('/', handleIndex);

var auth=false;
function handleIndex(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    lfs.readObjectFromFile('auth.json', function(newAuth) {
        if(newAuth.token)
        {
            res.end(fs.readFileSync(__dirname + '/ui/index.html'));
            auth=newAuth;
        }else{
            res.end(fs.readFileSync(__dirname + '/ui/init.html'));
        }
    });
}

app.get('/init', function(req, res) {
    if(!req.param('email') || !req.param('pass') || !req.param('key') || !req.param('secret') ) {
        res.writeHead(400);
        res.end('whats the creds yo?');
        return;
    }
    console.log("initializing for "+req.param('email') );
    var dapp = new dbox(req.param('key'), req.param('secret'));
    dapp.getAccessToken(req.param('email'), req.param('pass'), function(err, token, secret){
        if(err)
        {
            res.writeHead(500);
            res.end("failed: "+err);
            return;
        }
        fs.writeFileSync('auth.json', JSON.stringify({token:token, secret:secret}));
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end("saved access token "+token+", <a href='./'>continue</a>");        
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
