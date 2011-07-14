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
var sqlite = require("sqlite");

var app = express.createServer(connect.bodyParser(), connect.cookieParser())

var locker = require('../../Common/node/locker.js');
var lfs = require('../../Common/node/lfs.js');

var me;
var db = undefined;

// A stub do nothing function for some queries that need no processing
function doNothing(error, result) { }

app.set('views', __dirname);
app.get('/', function(req, res) {
    res.end("Ready.");
});

/**
Post a new entry to the journal.  The POST body must contain an entry value that is a valid
JSON object.  If the JSON object has a timestamp entry then that value will be used for the
storage otherwise a timestamp is added with the current system time.

Example:
    POST /post HTTP/1.0
    Content-Type:application/json

    entry={"any":"valid JSON"}

**/
app.post("/post", function(req, res) {
    try {
        var entry = JSON.parse(req.rawBody);
    } catch(E) {
        res.writeHead(400);
        res.end("Invalid JSON:" + E);
        return;
    }
    // Timestamp it if it's not user supplied
    if (!entry.hasOwnProperty("timestamp")) {
        entry.timestamp = Date.now();
    }

    db.query("INSERT INTO journal VALUES(?, ?)", [entry.timestamp, JSON.stringify(entry)], doNothing);

    res.end();
});

/**
Get an array of journal entries.  

Arguments:
    start - A start date to retrieve entries from, defaults to 0, UNIX epoch.
    end - An end date to retrieve entries from, defaults to the current system time.

Result:
    A JSON array returned as the mime-type application/json, each entry is the object that was
    stored with an added timestamp field with a UNIX timestamp.

Example:
    GET /get HTTP/1.0

    [{"stored":"json values", "timestamp":12314234234}]
**/
app.get("/get", function(req, res) {
    var query = "SELECT event FROM journal";
    var params = [];
    var start = req.query["start"];
    var end = req.query["end"];
    if (start || end) {
        query += " WHERE ";
        if (start) {
            query += "timestamp >= (?)";
            params.push(start);
        }
        if (end) {
            if (start) {
                query += " AND ";
            }
            query += "timestamp <= (?)";
            params.push(end);
        }
    }
    query += " ORDER BY timestamp";

    var totalRows = 0;
    console.log("Running " + query + " : "+ params);
    db.query(query, params, function(error, row) {
        if (error && totalRows == 0) {
            res.writeHead(400);
            res.end("Error querying journal");
            totalRows = -1;
            return;
        }

        if (totalRows == 0) {
            res.write("[");
        }
        if (row) {
            res.write((totalRows > 0 ? "," : "") + row.event);
            ++totalRows;
        } else {
            res.write("]");
            res.end();
        }
    });

});

function prepareDb()
{
    db = new sqlite.Database();
    db.open("journal.sqlite", function(error) {
        if (error) {
            process.stderr.write("DB Startup error:" + error + "\n");
            process.exit(1);
        }
        db.execute("SELECT name FROM sqlite_master WHERE name='journal'", function(error, results) {
            if (error)  {
                process.stderr.write("Finding journal error: " + error + "\n");
                db.close();
                process.exit(1);
            }

            if (results.length == 0) {
                db.execute("CREATE TABLE journal(timestamp INT PRMIARY KEY, event TEXT)", function(error, results) {
                    if (error) {
                        process.stderr.write("Journal create table error: " + error + "\n");
                        db.close();
                        process.exit(1);
                    }
                    sendStartup();
                });
            } else {
                process.nextTick(sendStartup);
            }
        });
    });
}

function sendStartup() {
    app.listen(processInfo.port,function() {
        var returnedInfo = {port: processInfo.port};
        process.stdout.write(JSON.stringify(returnedInfo));
        process.stdout.flush();
    });
}
// Woo woo startup stuff!
process.stdin.setEncoding('utf8');
process.stdin.on('data', function (chunk) {
    processInfo = JSON.parse(chunk);
    locker.initClient(processInfo);
    process.stderr.write("Locker init done\n");
    process.chdir(processInfo.workingDirectory);
    me = lfs.loadMeData();
    prepareDb();
});
process.stdin.resume();

