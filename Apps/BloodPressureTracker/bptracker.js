/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var url = require('url')
var express = require('express');
var connect = require('connect');
var request = require('request');
var sys = require('sys');
var fs = require("fs");
var path = require("path");

var app = express.createServer(connect.bodyParser(), connect.cookieParser())

var locker = require('../../Common/node/locker.js');
var lfs = require('../../Common/node/lfs.js');

var me;

var journal = undefined;
function getJournal(callback) {
    if (journal) {
        callback(true);
        return;
    }
    var ret = false;
    if (path.exists("journal.json")) {
        journal = JSON.parse(fs.readFileSync("journal.json")).journal;
        callback(true);
        return;
    } else {
        locker.providers("journal", function(err, providers) {
            if (!providers) {
                callback(false);
                return;
            }

            if (providers.length == 1) {
                journal = providers[0].id;
                fs.writeFileSync("journal.json", JSON.stringify({"journal":journal}));
                callback(true);
                return;
            }
            callback(false);
        });
    }
}

app.get("/", function(req, res) {
    getJournal(function(hasJournal) {
        if (hasJournal) {
            // show the current graph and add entry
            res.sendfile(__dirname + "/html/index.html");
        } else {
            // select a journal
            res.sendfile(__dirname + "/html/pickJournal.html");
        }
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

// Return static js files
app.get("/js/:filename", function(req, res) {
    console.log("Getting " + req.param("filename"));
    res.sendfile(__dirname + "/js/" + req.param("filename"));
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

