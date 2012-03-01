/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var request = require("request");
var url = require("url");
var lconfig = require("lconfig");
var serviceManager = require("lservicemanager");
var logger = require("./logger.js");
var syncManager = require('lsyncmanager');
var url = require('url');
var async = require('async');
var path = require('path');

var eventListeners = {};
var processingQueue = []; // queue of events being processed

exports.addListener = function(type, id, cb, batching) {
    logger.verbose("Adding a listener for " + id + cb + " to " + type);
    if (!eventListeners.hasOwnProperty(type)) eventListeners[type] = [];
    // Remove the previous listener for the id
    eventListeners[type] = eventListeners[type].filter(function(entry) {
        if (entry["id"] == id) return false;
        return true;
    });
    eventListeners[type].push({"id":id, "cb":cb, "batching":(batching ? true : false)});
}

exports.removeListener = function(type, id, cb) {
    logger.info("Going to remove " + id + cb + " from " + type);
    if (!eventListeners.hasOwnProperty(type)) return;
    var pos = findListenerPosition(type, id, cb);
    if (pos >= 0) eventListeners[type].splice(pos, 1);
}

// get all possible listeners
function fetchListeners(idr)
{
    var r = url.parse(idr);
    var types = [];
    // we're back-porting to the type system for now too
    var oldType = r.protocol.substr(0,r.protocol.length-1);
    types.push(oldType);
    oldType += '/' + r.host;
    types.push(oldType);
    if(r.pathname && r.pathname.length > 1)
    {
        oldType = r.pathname.substr(1);
        types.push(oldType);
        oldType += '/' + r.host;
        types.push(oldType);
    }
    delete r.hash;
    delete r.search;
    types.push(url.format(r));
    delete r.pathname;
    types.push(url.format(r));
    var ret = [];
    types.forEach(function(type){
        if(!eventListeners.hasOwnProperty(type)) return;
        eventListeners[type].forEach(function(e){ret.push(e)});
    });
    return ret;
}

exports.fireEvent = function(idr, action, obj) {
    logger.verbose("received event for " + idr + " action(" + action + ")");
    // Short circuit when no one is listening
    var listeners = fetchListeners(idr);
    if (listeners.length == 0) return;
    var newEventInfo = {
        idr:idr,
        action:action,
        data:obj,
    };
    listeners.forEach(function(listener){
        var lurl = lconfig.lockerBase + path.join("/Me", listener.id, listener.cb);
        if (listener.batching) {
          batchqueue(lurl).push(newEventInfo);
        } else {
          lqueue(lurl).push(newEventInfo);
        }
    });
}

exports.displayListeners = function(type) {
    return eventListeners[type];
}

function findListenerPosition(type, id, cb) {
    for (var i = 0; i < eventListeners[type].length; ++i) {
        var listener = eventListeners[type][i];
        if (listener.id == id && listener.cb == cb) return i;
    }
    return -1;
}

// create a queue per listener url, maximum 1 concurrency
var lqueues = {};
function lqueue(lurl)
{
    if(lqueues[lurl]) return lqueues[lurl];
    return lqueues[lurl] = async.queue(function(curEvent, callback){
        var httpOpts = {
            url: lurl,
            method:"POST",
            headers: {
                "Content-Type":"application/json",
                "Connection":"keep-alive"
            },
            body: JSON.stringify(curEvent)
        };
        logger.verbose(lqueues[lurl].length()+": sending "+curEvent.action+" event "+curEvent.idr+" to " + lurl);
        request(httpOpts, function(err, res, body) {
            if (err || res.statusCode != 200) {
                logger.error("There was an error sending " + curEvent.idr + " " + curEvent.action + " to " + lurl + " got " + (err || res.statusCode) + ', ' + JSON.stringify(body));
                logger.verbose(JSON.stringify(curEvent.data));
                //logger.verbose(body);
                // TODO: Need to evaluate the logic here, to see if we should retry or other options.
            }
            callback();
        });

    },1);
}
function BatchSendQueue(url) {
  this.url = url;
  this.items = [];
  this.running = false;
}
BatchSendQueue.prototype.push = function(item) {
  // Every push is added and we see if we can send more
  this.items.push(item);
  var self = this;
  if(!this.running) setTimeout(function(){ self.run(); }, 100); // give a chance to queue up if coming in fast
};
BatchSendQueue.prototype.run = function() {
  if (this.running) return;
  if (this.items.length == 0) return;

  this.running = true;
  var sendingItems = this.items;
  this.items = [];
  logger.verbose("Sending " + sendingItems.length + " batched events to " + this.url);
  var self = this;
  var req = request({url:this.url, method:"POST", headers:{"content-type":"application/jsonstream"}}, function(err, res, body) {
    if (err || res.statusCode != 200) {
      logger.error("There was an error sending batched events to " + self.url + " got " + (err || res.statusCode));
    }
    logger.verbose("Done sending batched events to " + self.url);
    // If more stuff came in we run again, otherwise push will get it next time
    self.running = false;
    if (self.items.length > 0) setTimeout(function(){ self.run(); }, 100); // breather
  });
  async.forEachSeries(sendingItems, function(item, sendCb) {
    req.write(JSON.stringify(item) + "\n");
    sendCb();
  }, function() {
    req.end();
  });
};
function batchqueue(lurl) {
  if (lqueues[lurl]) return lqueues[lurl];
  lqueues[lurl] = new BatchSendQueue(lurl);
  return lqueues[lurl];
}
