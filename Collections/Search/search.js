/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs'),
    locker = require('../../Common/node/locker.js');

var lutil = require('../../Common/node/lutil');
var lconfig = require('lconfig');
lconfig.load('../../Config/config.json');
var logger = require('logger');

var lockerInfo = {};
exports.lockerInfo = lockerInfo;

var express = require('express'),
    connect = require('connect');
var request = require('request');
var async = require('async');
var url = require('url');
var app = express.createServer(connect.bodyParser());
var index = require('./index');
var sync = require('./sync');


app.set('views', __dirname);


app.get('/', function(req, res) {
    res.send("You should use a search interface instead of trying to talk to me directly.");
});

app.post('/events', function(req, res) {
    if (!req.body.idr || !req.body.data) {
        logger.error("Invalid event.");
        return res.send("Invalid", 500);
    }
    var update = (req.body.action == "update") ? true : false;
    index.index(req.body.idr, req.body.data, update, function(err){
        if(err) logger.error(err);
        res.send(true);
    });
});

app.get('/update', function(req, res) {
    logger.info("updating search index");
    sync.gather(false, function(){
        logger.info("full search reindex started")
        return res.send('Full search reindex started');
    }, function(err){
        if(err) logger.error("search reindex error: "+err);
        logger.info("full search reindex completed");
    }, req.param("delay"));
});

app.get('/reindexForType', function(req, res) {
    logger.info("updating search index for "+req.param("type"));
    sync.gather(req.param("type"), function(){
        return res.send('Partial search reindex started');
    });
});

app.get('/query', function(req, res) {
    if (!req.param('q')) {
    }
    var args = {};
    args.q = lutil.trim(req.param('q'));
    if (!args.q || args.q.length == 0) {
        logger.warn('missing or invalid query');
        return res.send('missing or invalid query');
    }

    if (req.param('type')) args.type = req.param('type');
    if (req.param('limit')) args.limit = parseInt(req.param('limit'));
    if (req.param('snippet') == "true") args.snippet = true;
    if (req.param('sort') == "true") args.sort = true;
    if (req.param('type')) args.q = "idr:"+req.param('type')+" "+args.q;

    var all = []; // to keep ordering
    var ndx = {}; // to keep uniqueness
    index.query(args, function(item){
        if(ndx[item.idr]) return;
        ndx[item.idr] = item;
        all.push(item);
    }, function(err){
        if(err) logger.error(err);
        async.forEachSeries(all, function(item, cb){
            var idr = url.parse(item.idr);
            if(!idr || !idr.host || !idr.hash) return cb();
            var u = lockerInfo.lockerUrl + '/Me/' + idr.host + '/id/' + idr.hash.substr(1) + "?full=true";
            request.get({uri:u, json:true}, function(err, res, body) {
                if(err) logger.error("failed to get "+u+" - "+err);
                if(body) item.data = body;
                cb();
            });
        }, function(err){
            if(err) logger.error(err);
            res.send(all);
        });
    });
});

// Process the startup JSON object
process.stdin.resume();
var allData = "";
process.stdin.on('data', function(data) {
    allData += data;
    if (allData.indexOf("\n") > 0) {
        data = allData.substr(0, allData.indexOf("\n"));
        lockerInfo = JSON.parse(data);
        locker.initClient(lockerInfo);
        if (!lockerInfo || !lockerInfo.workingDirectory) {
            process.stderr.write('Was not passed valid startup information.'+data+'\n');
            process.exit(1);
        }
        process.chdir(lockerInfo.workingDirectory);
        index.init("index.db", function(err){
            if(err) logger.error(err);
            sync.init(lconfig, index, logger);
            app.listen(lockerInfo.port, 'localhost', function() {
                process.stdout.write(data);
            });
        });
    }
});
