/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var locker = require('../../Common/node/locker.js'),
    sync = require('./sync');


module.exports = function(app) {
    var handleIndex = function(res) { //before we auth
        res.redirect(app.meData.uri + 'auth');
    }
    app.get('/', function (req, res) {
        handleIndex(res);
    });
    
    var api = {};
    api.authComplete = function(auth, mongoCollections, validTypes) {
        sync.init(auth, mongoCollections);
        var index = getIndex(validTypes);
        handleIndex = function(res) { //after we auth, change behavior
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(index);
        }
        
        // getNew or updateAll data
        app.get('/:method/:type', function(req, res) {
            var type = req.params.type.toLowerCase();
            var method = req.params.method.toLowerCase();
            if(!validTypes[type]) {
                res.writeHead(401, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({error:'invalid type "' + type + '"'}));
            } else if(!validTypes[type][method]) {
                res.writeHead(401, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({error:'invalid method "' + method + '" for type "' + type + '"'}));
            } else {
                sync[method](type, function(err, repeatAfter, diaryEntry) {
                    if(err) {
                        res.writeHead(401, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify({error:err}));
                    } else {
                        locker.diary(diaryEntry);
                        locker.at('/' + method + '/' + type, repeatAfter);
                        res.writeHead(200, {'content-type':'application/json'});
                        res.end(JSON.stringify({success:diaryEntry}));
                    }
                });
            }
        });
        
        for(var validType in validTypes) {
            sync.eventEmitter.on(validType + '/fitbit', function(eventObj) {
                locker.event(validType + '/fitbit', eventObj);
            });
        }
    };
    return api;
}

function getIndex(validTypes) {
    var index = "<html>";
    for(var type in validTypes) {
        for(var method in validTypes[type]) {
            if(!validTypes[type][method])
                index += '<li><a href="/'+method+'/'+type+'">'+method+'/'+type+'</a></li>';
        }
    }
    return index + "</html>";
}