/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

// merge contacts from connectors

var locker = require('locker.js');
var logger;

var fs = require('fs');
var sync = require('./sync');
var dataStore = require("./dataStore");

var lockerInfo;
var express = require('express'),
    connect = require('connect');
var app = express.createServer(connect.bodyParser());
var request = require('request');

app.get('/state', function(req, res) {
    dataStore.getTotalCount(function(err, countInfo) {
        if(err) return res.send(err, 500);
        dataStore.getLastObjectID(function(err, lastObject) {
            if(err) return res.send(err, 500);
            var objId = "000000000000000000000000";
            if (lastObject) objId = lastObject._id.toHexString();
            var updated = Date.now();
            try {
                var js = JSON.parse(fs.readFileSync('state.json'));
                if(js && js.updated) updated = js.updated;
            } catch(E) {}
            res.send({ready:1, count:countInfo, updated:updated, lastId:objId});
        });
    });
});


app.get('/', function(req, res) {
    var fields = {};
    if (req.query.fields) {
        try {
            fields = JSON.parse(req.query.fields);
        } catch(E) {}
    }
    dataStore.getAll(fields, function(err, cursor) {
        if(!req.query["all"]) cursor.limit(20); // default 20 unless all is set
        if(req.query["limit"]) cursor.limit(parseInt(req.query["limit"]));
        if(req.query["offset"]) cursor.skip(parseInt(req.query["offset"]));
        if(req.query['stream'] == "true")
        {
            res.writeHead(200, {'content-type' : 'application/jsonstream'});
            cursor.each(function(err, object){
                if (err) logger.error(err); // only useful here for logging really
                if (!object) return res.end();
                res.write(JSON.stringify(object)+'\n');
            });
        }else{
            cursor.toArray(function(err, items) {
                res.send(items);
            });
        }
    });
});

app.get("/since", function(req, res) {
    if (!req.query.id) {
        return res.send([]);
    }

    var results = [];
    dataStore.getSince(req.query.id, function(item) {
        results.push(item);
    }, function() {
        res.send(results);
    });
});

app.get("/image/:photoId", function(req, res) {
    getImageHelper(req.params.photoId, "url", req.query.proxy, res);
});

app.get("/thumbnail/:photoId", function(req, res) {
    getImageHelper(req.params.photoId, "thumbnail", req.query.proxy, res);
});

function getImageHelper(id, field, proxy, res) {
    if (!id) {
        res.writeHead(500);
        res.end("No photo id supplied");
        return;
    }
    dataStore.get(id, function(error, data) {
        if (error || !data || !data[field]) return res.send(error||"no data", 500);
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "X-Requested-With");
        if(proxy) return request.get({url:data[field]}).pipe(res);
        res.writeHead(302, {"location":data[field]});
        return res.end("");
    });
};

app.get('/update', function(req, res) {
    sync.gatherPhotos(function(){
        res.send('Updating');
    });
});

app.post('/events', function(req, res) {
    if (!req.body.idr || !req.body.data) {
        logger.warn("Invalid event.");
        res.writeHead(500);
        res.end("Invalid Event");
        return;
    }

    dataStore.addEvent(req.body, function(err, eventObj) {
        if (err) {
            logger.error("Error processing: " + err);
            res.writeHead(500);
            res.end(err);
            return;
        }

        res.writeHead(200);
        res.end("Event Handled");
    });
});

app.get('/id/:id', function(req, res, next) {
    dataStore.get(req.param('id'), function(err, doc) {
        if(err) return res.send(err, 500);
        res.send(doc);
    })
});


// Process the startup JSON object
process.stdin.resume();
process.stdin.on('data', function(data) {
    lockerInfo = JSON.parse(data);
    locker.initClient(lockerInfo);
    if (!lockerInfo || !lockerInfo['workingDirectory']) {
        process.stderr.write('Was not passed valid startup information.'+data+'\n');
        process.exit(1);
    }
    process.chdir(lockerInfo.workingDirectory);

    var lconfig = require('lconfig');
    lconfig.load('../../Config/config.json');
    logger = require("logger.js");
    locker.connectToMongo(function(mongo) {
        sync.init(lockerInfo.lockerUrl, mongo.collections.photo, mongo, locker, lconfig);
        app.listen(0, function() {
            var returnedInfo = {port: app.address().port};
            process.stdout.write(JSON.stringify(returnedInfo));
        });
    });
});


