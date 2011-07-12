/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

require.paths.push(__dirname + '/../../Common/node');

var fs = require('fs'),
    http = require('http'),
    express = require('express'),
    connect = require('connect'),
    locker = require('locker'),
    serviceManager = require('lservicemanager'),
    search = require('./lib/elasticsearch/index.js');
//  search = require('./lib/clucene/index.js');
    
var app = express.createServer(connect.bodyParser(), connect.cookieParser(), connect.session({secret : "locker"}));

app.set('views', __dirname);

app.get('/',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    res.write("Start searching for goodies: <form action='/Me/Search/search' method='post'><input type='text' name='searchterm' /><input type='submit' name='Search' /></form>");
    res.write("<br /><br />");
    res.write("<a href='/Me/Search/indexContacts'>Start indexing my Contacts collection</a><br />");
    res.write("<a href='/Me/Search/indexLinks'>Start indexing my Links collection</a><br />");
    res.write("<a href='/Me/Search/indexMessages'>Start indexing my Messages collection</a><br />");
    res.end();
});

app.post('/search',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    var term = sanitize(req.param('searchterm'));
    res.write("Search results for <i>&quot;" + term + "&quot;</i>: ");
    var results = searcher.search(term, offset, limit);
    res.end();
});

app.get('/indexContacts',
function(req, res) {
    indexCollectionRecordsOfType('contacts', '/Me/contacts/allContacts');
});

app.get('/indexLinks',
function(req, res) {
    indexCollectionRecordsOfType('links', '/Me/links/allLinks');
});

app.get('/indexMessages',
function(req, res) {
    indexCollectionRecordsOfType('messages', '/Me/messages/allMessages');
});

// quick/dirty sanitization ripped from the Jade template engine
function sanitize(term){
    return String(term)
        .replace(/&(?!\w+;)/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function indexCollectionRecordsOfType(id, urlPath) {
    if (!serviceManager.isInstalled(id)) {
        console.error('Cannot index ' + id + ' for Search app because collection not available.');
        return false;
    }

    var serviceInfo = serviceManager.metaInfo(id);
    var url = url.parse(serviceInfo.uriLocal);
    var options = {
        host: url.hostname,
        port: url.port,
        path: urlPath,
        method:'GET'
    };
    
    var results;
    
    var req = http.request(options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        results += chunk;
      });
      
      res.on('end', function() {
          for (var i in results) {
              search.index(results[i]._id, id, results[i]);
          }
      });
    });

    req.on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });
}


var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    process.chdir(processInfo.workingDirectory);
    app.listen(processInfo.port);
    var returnedInfo = {};
    console.log(JSON.stringify(returnedInfo));
});
