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

module.exports = function(app, auth) {
    sync.init(auth);

    app.get('/', function (req, res) {
        if(!(auth && auth.appID && auth.appSecret && auth.token))
            res.redirect(app.meData.uri + 'auth');
        else {    
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(displayHTML("found a token, <a href='./friends'>load friends</a>"));
        }   
    });

    app.get('/friends',
    function(req, res) {
        sync.getFriends(function(err) {
            if(err) {
                res.writeHead(500, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(err));
            } else {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({success:"sync'd all your friends, how sociable!"}));
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


function displayHTML(content) {
    return "<!DOCTYPE html><html><head><meta charset='UTF-8'>"
        + "<meta name='description' content='Locker Facebook Connector' />"
        + "<title>Facebook Connector - Locker</title>"
        + "<style type='text/css'>"
        + ".header{background:rgb(125,174,92);width: 100%;color: white;border-radius:50px;}" 
        + " .goback{position:absolute;left:90%;top:3%;}" + " .body{background:rgb(125,174,92);border-radius:14px;color: white;}" 
        + " .content{margin-left:1%;} h3{margin-left:1%;margin-bottom:0.5%;} a{color:white;} a:hover{color:rgb(199,199,199);}"
        + "</style>"
        + "</head><body>"
        + "<div class='header'><h3>Facebook Connector</h3><div class='goback'>"
        + "<a href='/'>Go back</a></div></div><div class='body'><div class='content'>"
        + content + "</div></body></html>";
}