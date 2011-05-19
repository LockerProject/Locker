/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs'),
    url = require('url'),
    querystring = require('querystring'),
    sys = require('sys'),
    request = require('request'),
    locker = require('../../Common/node/locker.js'),
    lfs = require('../../Common/node/lfs.js'),
    sync = require('./sync');

var _debug = false;

var styles = require('./styles.js');
var format = function(content) {
    return styles.format(content);
};

module.exports = function(app, auth) {
    sync.init(auth);

    app.get('/', function (req, res) {
        if(!(auth && auth.appID && auth.appSecret && auth.token))
            res.redirect(app.meData.uri + 'auth');
        else {    
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(format("found a token, <a href='./friends'>load friends</a>"));
        }   
    });

    app.get('/friends',
    function(req, res) {
        sync.getFriends(function(err) {
            if(err) {
                res.writeHead(500, {'Content-Type': 'application/json'});
                res.end(format(JSON.stringify(err)));
            } else {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(format(JSON.stringify({success:"sync'd all your friends, how sociable!"})));
            }
        });
    });

    app.get('/feed',
    function(req, res) {
        sync.pullNewsFeed(function() {
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end();
        });
    });
    app.get('/photos',
    function(req, res) {
        sync.getAllPhotos(function() {
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end();
        });
    });
}