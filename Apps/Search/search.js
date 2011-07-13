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
    url = require('url'),
    express = require('express'),
    connect = require('connect'),
    locker = require('locker'),
    lconfig = require('lconfig'),
    search = require('./lib/elasticsearch/index.js');
//  search = require('./lib/clucene/index.js');
    
var app = express.createServer(connect.bodyParser(), connect.cookieParser(), connect.session({secret : "locker"}));

app.set('views', __dirname);

app.get('/',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    res.write("Start searching for goodies: <form action='/Me/search/search' method='post'><input type='text' name='searchterm' /><input type='submit' name='Search' /></form>");
    res.write("<br /><br />");
    res.write("<a href='/Me/search/indexContacts'>Start indexing my Contacts collection</a><br />");
    res.write("<a href='/Me/search/indexLinks'>Start indexing my Links collection</a><br />");
    res.write("<a href='/Me/search/indexMessages'>Start indexing my Messages collection</a><br />");
    res.end();
});

app.post('/search',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    var term = sanitize(req.param('searchterm'));
    res.write("Search results for <i>&quot;" + term + "&quot;</i>: ");
    search.search('contacts', term, 0, 10, function(err, results) {
      if (err) {
        console.error(err);
        res.end(err);
      }
      res.end(JSON.stringify(results));
    });
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

function indexCollectionRecordsOfType(type, urlPath) {

  var lockerUrl = url.parse(processInfo.lockerUrl);
  var options = {
    host: lockerUrl.hostname,
    port: lockerUrl.port,
    path: urlPath,
    method:'GET'
  };

  var data = '';
  var jsonDelim = 0;

  var req = http.get(options, function(res) {
    res.setEncoding('utf8');
    
    res.on('data', function (chunk) {
      data += chunk;    
    });

    res.on('end', function() {
      search.map(type);
      var results = JSON.parse(data);
      for (var i in results) {
        search.index(results[i]._id, type, results[i], function(err, result) {
          if (err) {
            console.log('error indexing ' + type + ' with ID of ' + results[i]._id);
          }
        });
      }
    });
  });

  req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
  });
}

var stdin = process.openStdin();
var processInfo;

stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    processInfo = JSON.parse(chunk);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    app.listen(processInfo.port, function() {
        var returnedInfo = {port: processInfo.port};
        process.stdout.write(JSON.stringify(returnedInfo));
    });
});
stdin.resume();