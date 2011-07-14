/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var url = require('url');
var express = require('express');
var connect = require('connect');
var request = require('request');
var sys = require('sys');
var fs = require("fs");
var path = require("path");

var app = express.createServer(connect.bodyParser(), connect.cookieParser());
app.use(express.static(__dirname + '/static'));

var locker = require('../../Common/node/locker.js');
var lfs = require('../../Common/node/lfs.js');

var me;

var journal = undefined;
function getJournal(callback) {
    console.log("Journal:");
    if (journal) {
        console.log(journal);
        callback(true);
        return;
    }
    var ret = false;
    if (path.exists("journal.json")) {
        journal = JSON.parse(fs.readFileSync("journal.json")).journal;
        console.log(journal);
        callback(true);
        return;
    } else {
        console.log("else");
        locker.providers("journal", function(err, providers) {
                             console.log(err, providers);
                             console.log("looking");
            if (!providers) {
                console.log("!providers");
                callback(false);
                return;
            }

            if (providers.length == 1) {
                // only one journal, use it
                journal = providers[0].id;
                fs.writeFileSync("journal.json", JSON.stringify({"journal":journal}));
                callback(true);
                return;
            }

            if (providers.length > 1) {
                // have the user pick a journal
                console.log("multiple journals");
                callback(false);
                return;
            }
                             
            console.log("giving up");
            callback(false);
        });
    }
}

app.get("/", function(req, res) {
    console.log("woo");
    getJournal(function(hasJournal) {
        if (hasJournal) {
            console.log("hasJournal");
            // show the current graph and add entry
            res.sendfile(__dirname + "/static/index.html");
        } else {
            console.log("!hasJournal");
            // select a journal
            res.sendfile(__dirname + "/static/pickJournal.html");
        }
    });
});

app.get("/getJournals", function(req, res) {
            var callback = function(providers) {
                res.writeHead(200, {
                                  'Content-Type': 'text/html'
                              });
                res.end(JSON.stringify(providers));
            };
            
            locker.providers("journal", 
                             function(err, providers) {
                                 console.log(err, providers);
                                 console.log("looking");
                                 if (!providers) {
                                     console.log("!providers");
                                     callback([]);
                                     return;
                                 }
                                 
                                 if (providers.length == 1) {
                                     // only one journal, use it
                                     journal = providers[0].id;
                                     console.log("1 journal");
                                     console.log(journal);
                                     callback(providers);
                                     return;
                                 }
                                 
                                 if (providers.length > 1) {
                                     // have the user pick a journal
                                     console.log("multiple journals");
                                     console.log(providers);
                                     callback(providers);
                                     return;
                                 }
                                 
                                 console.log("giving up");
                                 callback([]);
                                 return;
                             });
});

// Usually ajax call to retrieve rates
app.get("/rates", function(req, res) {
    getJournal(function(hasJournal) {
        if (!hasJournal) {
            res.writeHead(400);
            res.end("[]");
            return;
        }

        var now = Date.now();
        var prevDate = now - (14 * 24 * 60 * 60 * 1000);

        var journalURL = (processInfo.lockerUrl + "/Me/" + journal + "/get?" + querystring.stringify({start:prevDate, end:now}));
        request.get({url:journalURL}, function(error, request, result) {
            entries = JSON.parse(result);
            // Filter to only bp entries
            entries = entries.filter(function(entry) {
                if (entry.hasOwnProperty("systolic") && entry.hasOwnProperty("diastolic")) return true;
                return false;
            });
            res.writeHead(200, {"Content-Type":"application/json"});
            res.end(JSON.stringify(entries));
        });
    });
});

// Add a new rate to the journal
app.post("/addRate", function(req, res) {
    getJournal(function(hasJournal) {
        if (!hasJournal) {
            res.end();
            return;
        }

        var entry = {
            systolic:req.body["s"],
            diastolic:req.body["d"]
        };
        if (req.body.hasOwnProperty("t")) entry.timestamp = req.body["t"];

        var journalURL = (processInfo.lockerUrl + "/Me/" + journal + "/post");
        request.post({
            url:journalURL,
            json:entry
        }, function(err, req, results) {
            res.end();
        });
    });
});

// Woo woo startup stuff!
var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    processInfo = JSON.parse(chunk);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    me = lfs.loadMeData();
    app.listen(processInfo.port,function() {
        var returnedInfo = {port: processInfo.port};
        process.stdout.write(JSON.stringify(returnedInfo));
    });
});
stdin.resume();

