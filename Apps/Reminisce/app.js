/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/


var fs = require('fs'),http = require('http');
var express = require('express'),connect = require('connect');
var app = express.createServer(connect.bodyParser(), connect.cookieParser());
var locker = require('locker');
var lfs = require('lfs');
var request = require('request');
var nodemailer = require('nodemailer');
var lcrypto = require('lcrypto');
var lconfig = require('lconfig');
//TODO: fix lconfig and remove this! I need it for lcrypto?! 
lconfig.load('../../Config/config.json');

var me;
var auth=false;
var processInfo;

app.set('views', __dirname);

app.get('/', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(fs.readFileSync(__dirname + '/ui/index.html'));
});

app.get('/enable', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    if(!auth)
    {
        res.end("missing mail server auth, set up imap connector plz");
        return;
    }
    me.enabled = true;
    lfs.syncMeData(me);
    res.end("Enabled");
    send();
});

app.get('/disable', function(req, res) {
    me.enabled = false;
    lfs.syncMeData(me);
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end("Disabled");
});

app.get('/send', function (req, res) {
    if(!auth)
    {
        res.end("u.fail");
        return;
    }
    res.end("sent");
    send();
});

function send()
{
    locker.at('/send',86395);
    request.get({uri:processInfo.lockerUrl+"/Me/photos/allPhotos"},function(err, res, body){
        if(err)
        {
            console.log("failed to get photos: "+err);
            return;
        }
        var photos = JSON.parse(body);
        // ideally this is a lot smarter, about weighting history, tracking to not do dups, etc
        var rand = Math.floor(Math.random() * photos.length);
        console.log("for "+auth.username+" we picked random photo: "+JSON.stringify(photos[rand]));
        // hard coded to gmail for testing (ver -0.1)
        nodemailer.SMTP = {
            host: 'smtp.gmail.com',
            port: 587,
            ssl: false,
            use_authentication: true,
            user: auth.username,
            pass: auth.password
        };
        // Message object
        var cid = Date.now() + '.image.png';
        var message = {
            sender: 'Reminisce <42@awesome.com>',
            to: auth.username,
            subject: 'something fun and random  ✔',
            body: 'Hello to myself!',
            html:'<p><b>reminiscing...</b> <img src="cid:"' + cid + '"/></p>',
            debug: true,
            attachments:[
                {
                    filename: 'image.png',
                    cid: cid
                }
            ]
        };
        // try to get the message and send it as an attachment...
        try{
            var imgurl = processInfo.lockerUrl+"/Me/photos/fullPhoto/" + photos[rand].id;
            request.get({uri:imgurl},function(err, res, body){
                if(err)
                {
                    console.error("failed to get photo "+imgurl);
                    return;
                }
                // this doesn't work, garbles the image somehow, dunno what buffer magic is needed :(
                message.attachments[0].contents = body;
                mail = nodemailer.send_mail(message, function(err, ok){
                    if(err){
                        console.error('Error occured: '+err);
                    }
                    if(ok){
                        console.error('Message sent successfully!');
                    }
                });
            });
        }catch(e) {
            console.error('Caught Exception',e);
        }
    });
};

var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    processInfo = JSON.parse(chunk);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    me = lfs.loadMeData();
    // try stealing imap's auth to get going
    lcrypto.loadKeys(function(){
        try {
            var authData = JSON.parse(fs.readFileSync('../imap/auth.json', 'utf-8'));
            if(authData && authData.hasOwnProperty('username') && authData.hasOwnProperty('password') && authData.hasOwnProperty('host') && authData.hasOwnProperty('port'))
            {
                    authData.username = lcrypto.decrypt(authData.username);
                    if(authData.username.indexOf("@") == -1) authData.username += "@gmail.com"; // meh! HACK!
                    authData.password = lcrypto.decrypt(authData.password);
                    auth = authData;
            }
        }catch(e){
            console.error("failed to hack into imap auth: "+e);
        };
        app.listen(processInfo.port,function() {
            var returnedInfo = {};
            console.log(JSON.stringify(returnedInfo));
        });        
    });
});

