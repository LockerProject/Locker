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
    path = require('path'),
    async = require('async'),
    fs = require('fs'),
    socketio = require('socket.io'),
    request = require('request');
var logger = require("logger").logger;
var lutil = require('lutil');
var lconfig = require('../../Common/node/lconfig.js');
lconfig.load('../../Config/config.json');

var externalBase;
var closed;
var locker;
var viewers = {available:{}, selected:{
    photos: "photosv09",
    contacts: "contactsviewer",
    links: "linkalatte",
    places: "helloplaces"
}};
module.exports = function(passedLocker, passedExternalBase, listenPort, callback) {
    locker = passedLocker;
    externalBase = passedExternalBase;
    app.listen(listenPort, callback);
};

var app = express.createServer();
app.use(express.cookieParser());
app.use(express.bodyParser());

app.configure(function() {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.set('view options', {
      layout: false
    });
    app.use(express.bodyParser());
    app.use(express.static(__dirname + '/static'));
});

var drawPage = function(req, res) {
    try {
         last = JSON.parse(fs.readFileSync('state.json'));
         closed = last.closed;
    } catch(err) {
    }
    res.render('app', {
        dashboard: lconfig.dashboard,
        closed: closed
    });
};

app.get('/app', drawPage);
app.get('/', drawPage);


// dumb defaults
var options = { logger: {
   info: new Function(),
   error: new Function(),
   warn: new Function(),
   debug: new Function()
 }};
var io = socketio.listen(app,options);
io.set("transports", ["jsonp-polling", "xhr-polling", "htmlfile"]);

app.get('/apps', function(req, res) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    var apps = {contacts: {url : externalBase + '/Me/contactsviewer/', id : 'contactsviewer'},
                photos: {url : externalBase + '/Me/photosv09/', id : 'photosv09'},
                links: {url : externalBase + '/Me/linkalatte/', id : 'linkalatte'},
                places: {url : extrernalBase + '/Me/helloplaces/', id : 'helloplaces'},
                search: {url : externalBase + '/Me/searchapp/', id : 'searchapp'}};
    res.end(JSON.stringify(apps));
});

app.get('/viewers', function(req, res) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    getViewers(function() {
        res.end(JSON.stringify(viewers));
    });
});

app.post('/setViewer', function(req, res) {
    var type = req.body.type;
    var handle = req.body.handle;
    if(!type) {
        console.error("No type given for viewer");
    } else if(!handle) {
        console.error("No handle given for viewer");
    } else {
        if(!(type === 'photos' || type === 'contacts' || type === 'links' || type === 'places')) {
            console.error("Type is invalid for a viewer:" + type);
        } else {
            // phew!
            console.log("Setting the viewer for " + type + " to " + handle);
            viewers.selected[type] = handle;
            lutil.atomicWriteFileSync('viewers.json', JSON.stringify(viewers.selected));
        }
    }
    res.writeHead(200);
    res.end("true");
});

var eventInfo = {
    "link":{"name":"link", "timer":null, "count":0, "new":0, "updated":0, "lastId":0},
    "contact":{"name":"contact", "timer":null, "count":0, "new":0, "updated":0, "lastId":0},
    "photo":{"name":"photo", "timer":null, "count":0, "new":0, "updated":0, "lastId":0},
    "place":{"name":"place", "timer":null, "count":0, "new":0, "updated":0, "lastId":0}
};

// lame way to track if any browser is actually open right now
var isSomeoneListening = 0;

app.post('/new', function(req, res) {
    res.send({});
    io.sockets.emit('newservice', req.body.data);
});

app.post('/event', function(req, res) {
    res.send({}); // any positive response
    if(isSomeoneListening == 0) return; // ignore if nobody is around, shouldn't be getting any anyway
    if (req && req.body) {
        if(req.body.idr.indexOf("github") >= 0) {
            io.sockets.emit('viewer', req.body);
        } else {
            var idr = req.body.idr.split(':');
            var evInfo = eventInfo[idr[0]];
            if (evInfo.timer) {
                clearTimeout(evInfo.timer);
            }
            evInfo.timer = function(ev){ evInfo = ev; return setTimeout(function() {
                // stuff changed, go get the newest total to see if it did
                request.get({uri:locker.lockerBase+'/Me/'+evInfo.name+'s/state',json:true},function(err,res,body){
                    if(!body || !body.count || evInfo.count == body.count) return;
                    io.sockets.emit('event',{"name":evInfo.name, "new":(body.count - evInfo.count), "count":body.count, "updated":body.updated, "lastId":evInfo.lastId});
                    console.log("Sent events, setting to ",body);
                    evInfo.count = body.count;
                    evInfo.updated = body.updated;
                    evInfo.lastId = body.lastId;
                    saveState();
                });
            }, 2000)}(evInfo); // wrap for a new stack w/ evInfo isolated
        }
    }
});

app.post('/closed', function(req, res) {
    closed = true;
    saveState();
});

// just snapshot to disk every time we push an event so we can compare in the future
function saveState()
{
    var counts = {};
    for (var key in eventInfo) {
        if (eventInfo.hasOwnProperty(key)) counts[key] = {count:eventInfo[key].count, lastId:eventInfo[key].lastId};
    }
    counts.closed = closed;
    lutil.atomicWriteFileSync("state.json", JSON.stringify(counts));
}

// compare last-sent totals to current ones and send differences
function bootState(doneCb)
{
    if(isSomeoneListening > 1) return doneCb(); // only boot after we've been idle
    logger.debug("booting state fresh");
    async.forEach(['contacts','links','photos','places'],function(coll,callback){
        //logger.debug("fetching "+locker.lockerBase+'/Me/'+coll+'/state '+ JSON.stringify(locker) );
        request.get({uri:locker.lockerBase+'/Me/'+coll+'/state',json:true},function(err,res,body){
            if(coll == 'links') var evInfo = eventInfo['link'];
            if(coll == 'photos') var evInfo = eventInfo['photo'];
            if(coll == 'contacts') var evInfo = eventInfo['contact'];
            if(coll == 'places') var evInfo = eventInfo['place'];
            evInfo.count = (body && body.count && body.count > 0) ? body.count : 0;
            evInfo.updated = (body && body.updated && body.updated > 0) ? body.updated : 0;
            evInfo.lastId = (body && body.lastId) ? body.lastId : "0";
            callback();
        });
    },function(){
        logger.debug("finishing boot");
        var last = {
            "link":{"count":0, "lastId":0},
            "contact":{"count":0, "lastId":0},
            "photo":{"count":0, "lastId":0},
            "place":{"count":0, "lastId":0}
        };
        // try to load from file passively
        try {
            last = JSON.parse(fs.readFileSync('state.json'));
            closed = last.closed;
        } catch(err) {
        }
        for(var type in eventInfo) {
            // stupd vrbos
            if(eventInfo[type].count > last[type].count) {
                console.log("Sent a bootup event",eventInfo[type]);
                io.sockets.emit('event',{"name":eventInfo[type].name, "updated":eventInfo[type].updated, "lastId":last[type].lastId, "new":(eventInfo[type].count - last[type].count)});
            }
        }
        saveState(); // now that we possibly pushed events, note it
        locker.listen("photo","/event");
        locker.listen("link","/event");
        locker.listen("contact","/event");
        locker.listen("place", "/event");
        locker.listen('newservice', '/new');
        locker.listen('view/github', "/event");
        doneCb();
    });
}

function getViewers(callback) {
    locker.map(function(err, map) {
        if(err) {
            logger.debug("failed to get map "+err);
        } else {
            viewers.available = {};
            map.available.forEach(function(app) {
                if(app.viewer) {
                    if(!viewers.available[app.viewer])
                        viewers.available[app.viewer] = {};
                    viewers.available[app.viewer][app.handle] = app;
                }
            });
            try {
                viewers.selected = JSON.parse(fs.readFileSync('viewers.json'));
            } catch(err) {
            }
        }
        callback();
    });
}

io.sockets.on('connection', function (socket) {
    logger.debug("++ got new socket.io connection " + isSomeoneListening + " for " + socket.id + " disconnected:" + socket.disconnected);
    socket.emit("heartbeat", true);
    socket.on('disconnect', function () {
        logger.debug("Socket " + socket.id + " is disconnected");
        isSomeoneListening--;
        // when nobody is around, don't receive events anymore
        if(isSomeoneListening == 0)
        {
            logger.debug("everybody left, quiesce");
            locker.deafen("photo","/event");
            locker.deafen("link","/event");
            locker.deafen("place","/event");
            locker.deafen("contact","/event");
            locker.deafen("view/github","/event");
            locker.deafen('newservice', '/new');
        }
    });
    isSomeoneListening++;
    bootState(function(){
        var counts = {};
        for (var key in eventInfo) {
            if (eventInfo.hasOwnProperty(key)) counts[eventInfo[key].name] = {count:eventInfo[key].count, updated:eventInfo[key].updated};
        }
        console.log("Sending counts");
        console.dir(socket);
        socket.emit("counts", counts);
    });

});
