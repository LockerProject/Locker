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
    dbox = require('dropbox').DropboxClient,
    app = express.createServer(
                    connect.bodyParser(),
                    connect.cookieParser()),
    locker = require('../../Common/node/locker.js'),
    lfs = require('../../Common/node/lfs.js');

var me;

app.set('views', __dirname);
app.get('/', handleIndex);

var dapp=false;
function handleIndex(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    if(dapp)
    {
        res.end(fs.readFileSync(__dirname + '/ui/index.html'));
    }else{
        res.end(fs.readFileSync(__dirname + '/ui/init.html'));
    }
}

app.get('/init', function(req, res) {
    if(!req.param('email') || !req.param('pass') || !req.param('key') || !req.param('secret') ) {
        res.writeHead(400);
        res.end('whats the creds yo?');
        return;
    }
    console.log("initializing for "+req.param('email') );
    dapp = new dbox(req.param('key'), req.param('secret'));
    dapp.getAccessToken(req.param('email'), req.param('pass'), function(err, token, secret){
        if(err)
        {
            res.writeHead(500);
            res.end("failed: "+JSON.stringify(err));
            return;
        }
        fs.writeFileSync('auth.json', JSON.stringify({key:req.param('key'), ksecret:req.param('secret'), token:token, tsecret:secret}));
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end("saved access token "+token+", <a href='./'>continue</a>");        
    });
});

app.get('/info', function(req, res) {
    res.writeHead(200);
    dapp.getAccountInfo(function (err, data) {
      if (err) res.end('Error: ' + err)
      else res.end(data.display_name + ', ' + data.email)
    });
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
    dapp.putFile(req.param('file'), '', function (err, data) {
        if (err)
            console.log("failed: "+err);
        else
            console.log("saved!");
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
        if(auth.token) dapp = new dbox(auth.key, auth.ksecret, auth.token, auth.tsecret);
        app.listen(processInfo.port,function() {
            var returnedInfo = {port: processInfo.port};
            console.log(JSON.stringify(returnedInfo));
        });
    });

});
