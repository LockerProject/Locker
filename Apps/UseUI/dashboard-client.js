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
    request = require('request');

var externalBase;
module.exports = function(passedExternalBase, listenPort) {
    externalBase = passedExternalBase;
    app.use(express.static(__dirname + '/static'));
    app.listen(listenPort);
}

var app = express.createServer();
app.use(connect.bodyParser());

app.get('/apps', function(req, res) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    var apps = {contacts: {url : externalBase + '/Me/contactsviewer/', id : 'contactsviewer'},
                photos: {url : externalBase + '/Me/hellophotos/', id : 'hellophotos'},
                links: {url : externalBase + '/Me/linkalatte/', id : 'linkalatte'},
                search: {url : externalBase + '/Me/searchapp/', id : 'searchapp'}}
    res.end(JSON.stringify(apps));
});
