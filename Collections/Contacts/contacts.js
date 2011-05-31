/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

// merge contacts from journals
var fs = require('fs'),
    sys = require('sys'),
    http = require('http'),
    url = require('url'),
    lfs = require('../../Common/node/lfs.js'),
    locker = require('../../Common/node/locker.js'),
    lconfig = require('../../Common/node/lconfig.js'),
    request = require('request'),
    crypto = require('crypto');
    
var sync = require('./sync');

var lockerInfo;
var express = require('express'),
    connect = require('connect');
var app = express.createServer(connect.bodyParser());

app.set('views', __dirname);

app.get('/', function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    lfs.readObjectsFromFile('contacts.json',function(contacts){
        res.write('<html><p>Found '+contacts.length+' contacts: <ul>');
        for(var i in contacts) {
            res.write('<li>' + (contacts[i].name? '<b>' + contacts[i].name + ': </b>' : '') +
                            JSON.stringify(contacts[i])+'</li>');
        }
        res.write('</ul></p></html>');
        res.end();
    });
});
// 
// app.get('/allContacts', function(req, res) {
//     res.writeHead(200, {
//         'Content-Type':'text/javascript'
//     });
//     res.write('[');
//     res.write(fs.readFileSync('contacts.json', 'utf8'));
//     res.write(']');
//     res.end();
// });

app.get('/update', function(req, res) {
    sync.gatherContacts();
    res.writeHead(200);
    res.end('Updating');
});

app.get('/foursquareListener', function(req, res) {
    console.log("req" + req.body);
    sys.debug(req);
    res.writeHead(200);
    res.end('cool');
});

// Process the startup JSON object
process.stdin.resume();
process.stdin.on('data', function(data) {
    lockerInfo = JSON.parse(data);
    locker.initClient(lockerInfo);
    if (!lockerInfo || !lockerInfo['workingDirectory']) {
        process.stderr.write('Was not passed valid startup information.'+data+'\n');
        process.exit(1);
    }
    process.chdir(lockerInfo.workingDirectory);
    
    locker.connectToMongo(function(thecollections) {
        sync.init(lockerInfo.lockerUrl, thecollections.contacts);
        app.listen(lockerInfo.port, 'localhost', function() {
            sys.debug(data);
            process.stdout.write(data);
            locker.listen('/foursquare/contact', 'foursquareListener');
            // gatherContacts();
        });
    });
});


