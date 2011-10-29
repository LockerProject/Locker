/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/


var fs = require('fs');
var express = require('express'),connect = require('connect');
var app = express.createServer(connect.bodyParser(), connect.cookieParser());
var locker = require('locker');
var lfs = require('lfs');
var lutil = require('lutil');
var request = require('request');
var nodemailer = require('nodemailer');
var lcrypto = require('lcrypto');
var lconfig = require('lconfig');
lconfig.load('../../Config/config.json');

var me;
var auth=false;
var processInfo;

app.set('views', __dirname);

app.get('/', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    if(!auth || req.param("change")) return res.end(fs.readFileSync(__dirname + '/auth.html'));
    res.write("<p>Using "+auth.host+":"+auth.port+" ");
    if(auth.ssl) res.write("(ssl)");
    if(auth.user) res.write("authenticating as "+auth.user);
    res.write("<br><a href='?change=1'>change</a> or <a href='javascript:window.location=\"test?to=\"+window.prompt(\"recipient email address\")'>send test message</a>");
    res.end();
});

app.post('/save', function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    if(!req.body || !req.body.host || !req.body.port) return res.end("missing minimum required host/port :(");
    nodemailer.SMTP = auth = {host:req.body.host, port:req.body.port};
    if(req.body.ssl) auth.ssl = true;
    if(req.body.user && req.body.pass)
    {
        auth.use_authentication = true;
        auth.user = req.body.user;
        auth.pass = lcrypto.encrypt(req.body.pass);
    }
    lutil.atomicWriteFileSync("auth.json", JSON.stringify(auth, null, 4));
    if(auth.pass) auth.pass = req.body.pass; // keep around unencrypted
    res.end("saved! <a href='./'>continue</a>");
});

app.get('/state', function (req, res) {
    var ready = (auth) ? 1 : 0;
    res.send({ready:ready});
});

app.get('/test', function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    if(!req.param("to") || req.param("to").indexOf("@") <= 0) return res.end("invalid recipient")
    var message = {
        sender: 'Testificate <42@awesome.com>',
        to: req.param("to"),
        subject: 'test message  ✔',
        body: 'Hello to you!',
        html:'<p>it <b>WORKED</b></p>',
        debug: true
    };
    request.post({url:locker.lockerBase + "/Me/smtp/send", json:message}, function(err, r, body){
        if(err || !body) return res.end("failed "+err);
        return res.end("sent!");
    });
});

app.post('/send', function (req, res) {
    if(!auth) return res.send(false);
    if (!req.body || !req.body.to) return res.send(false);
    console.error("DEBUG SMTP: "+JSON.stringify(req.body));
    var sent = false;
    nodemailer.send_mail(req.body, function(err, ok){
        if(sent) return; // bug in nodemailer will call back multiple times!
        sent=true;
        if(err || !ok){
            console.error('Error occured: '+err);
            return res.send(false);
        }
        res.send(true);
    })
});

var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    processInfo = JSON.parse(chunk);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    me = lfs.loadMeData();
    lcrypto.loadKeys(function(){
        try {
            var a = JSON.parse(fs.readFileSync('auth.json', 'utf8'));
            if(a.hasOwnProperty('host') && a.hasOwnProperty('port'))
            {
                    if(a.pass) a.pass = lcrypto.decrypt(a.pass);
                    nodemailer.SMTP = auth = a;
            }
        }catch(e){
        };
        app.listen(processInfo.port,function() {
            var returnedInfo = {};
            console.log(JSON.stringify(returnedInfo));
        });
    });
});

