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
    fs = require('fs'),
    url = require('url');

var app = express.createServer(
        connect.bodyParser(),
        connect.cookieParser(),
        connect.session({secret : "locker"}));

var uri, auth, callback;
var twitterClient;

exports.init = function(baseUri, storedAuth, app, onCompletedCallback) {
    uri = baseUri;
    console.error(uri);
    callback = onCompletedCallback;
    auth = storedAuth || {};
    if(auth.consumerKey && auth.consumerSecret && auth.token) {
        callback(auth, null, null);
    } else {
        app.get('/auth', handleAuth);
        app.get('/saveAuth', saveAuth);
    }
}

function handleAuth(req, res) {
    if(!(auth.consumerKey && auth.consumerSecret)) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end("<html>Enter your personal Twitter app info that will be used to sync your data" + 
                " (create a new one <a href='http://dev.twitter.com/apps/new'>here</a> " +
                "using the callback url of http://"+url.parse(uri).host.replace("localhost", "127.0.0.1")+"/) " +
                "<form method='get' action='saveAuth'>" +
                    "Consumer Key: <input name='consumerKey'><br>" +
                    "Consumer Secret: <input name='consumerSecret'><br>" +
                    "<input type='submit' value='Save'>" +
                "</form></html>");
    } else if(!auth.token) {
        if(!twitterClient) 
            twitterClient = require('./twitter_client')(auth.consumerKey, auth.consumerSecret, uri + 'auth');
        twitterClient.getAccessToken(req, res, function(err, newToken) {
            if(err)
                console.error(err);
            if(newToken != null) {
                auth.token = newToken;
                callback(auth, req, res);
            }
        });    
    } else { 
        callback(auth, req, res);
    }
}

function saveAuth(req, res) {
    if(!req.param('consumerKey') || !req.param('consumerSecret')) {
        res.writeHead(400);
        res.end("missing field(s)?");
    } else {
        res.writeHead(200, {'Content-Type': 'text/html'});
        auth.consumerKey = req.param('consumerKey');
        auth.consumerSecret = req.param('consumerSecret');
        res.end("<html>thanks, now we need to <a href='./auth'>auth that app to your account</a>.</html>");
    }
}
