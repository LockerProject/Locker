/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var express = require('express'),
    connect = require('connect'),
    socketio = require('socket.io'),
    request = require('request');

var externalBase;
var locker;
module.exports = function(passedLocker, passedExternalBase, listenPort, callback) {
    locker = passedLocker;
    externalBase = passedExternalBase;
    app.use(express.static(__dirname + '/static'));
    app.listen(listenPort, callback);
}

var app = express.createServer();
app.use(connect.bodyParser());
// dumb defaults
var options = { logger: {
   info: new Function(),
   error: new Function(),
   warn: new Function(),
   debug: new Function()
 }};
var io = socketio.listen(app,options);

app.get('/apps', function(req, res) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    var apps = {contacts: {url : externalBase + '/Me/contactsviewer/', id : 'contactsviewer'},
                photos: {url : externalBase + '/Me/photosviewer/', id : 'photosviewer'},
                links: {url : externalBase + '/Me/linkalatte/', id : 'linkalatte'},
                search: {url : externalBase + '/Me/searchapp/', id : 'searchapp'}}
    res.end(JSON.stringify(apps));
});

app.get('/event', function(req, res) {
    res.send({}); // any positive response
    if (req && req.body) {
        io.sockets.emit('event',req.body);
    }
});

// TODO does multiple simul connections create multiple events?
io.sockets.on('connection', function (socket) {
    console.error("got new socket.io connection, adding listeners");
    locker.listen("photo","/event");
    locker.listen("link","/event");
    locker.listen("contact/full","/event");
    // TODO on disconnected, un-listen!
});
