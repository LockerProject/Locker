/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

require.paths.push(__dirname + '/node_modules');

var fs = require('fs'),
    http = require('http'),
    url = require('url');
    
var express = require('./node_modules/express'),
    app = express.createServer();
    
var locker = require('locker'),
    lconfig = require('lconfig'),
    search = require('./lib/elasticsearch/index.js');
//  search = require('./lib/clucene/index.js');
    

// Config
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('view options', {layout: true});
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.static(__dirname + '/public'));
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'locker'}));
  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});


// Routes
app.get('/',
function(req, res) {
  console.log(res);
    res.render('index', {
      error: null
    });
});

app.post('/search',
function(req, res) {
    var term = sanitize(req.param('searchterm'));
    var results = [];
    var error = null;
    
    search.search('contacts', term, 0, 10, function(err, results) {
      if (err) {
        console.error(err);
        error = err;
      }
      res.render('search', {
        term: term,
        results: results.hits.hits,
        took: results.took,
        total: results.hits.total,
        raw: JSON.stringify(results),
        error: err
      });
    });
});

app.get('/indexContacts',
function(req, res) {
    indexCollectionRecordsOfType('contacts', '/Me/contacts/allContacts', function(err, results) {
      if (err) {
        res.end('Error when attempting to index');
      } else {
        res.end('Indexed ' + results.count + ' contacts');
      }
    });
});

app.get('/indexLinks',
function(req, res) {
    indexCollectionRecordsOfType('links', '/Me/links/allLinks', function(err, results) {
      if (err) {
        res.end('Error when attempting to index');
      } else {
        res.end('Indexed ' + results.count + ' links');
      }
    });
});

app.get('/indexMessages',
function(req, res) {
    indexCollectionRecordsOfType('messages', '/Me/messages/allMessages', function(err, results) {
      if (err) {
        res.end('Error when attempting to index');
      } else {
        res.end('Indexed ' + results.count + ' messages');
      }
    });
});

// quick/dirty sanitization ripped from the Jade template engine
function sanitize(term){
    return String(term)
        .replace(/&(?!\w+;)/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function indexCollectionRecordsOfType(type, urlPath, callback) {

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
            callback(err);
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