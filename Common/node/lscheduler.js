/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var lfs = require("lfs");
var fs = require("fs");
var serviceManager = require("lservicemanager");
var url = require("url");
var request = require("request");
var lconfig = require('lconfig');
var path = require('path');

SCHEDULE_ACTION_DIRECT = 0; // Live direct callbacks, not savable
SCHEDULE_ACTION_URI = 1; // Indirect service URIs, savable

exports.Scheduler = function() {
    this.scheduledActions = [];
    this.filename = path.join(lconfig.lockerDir, lconfig.me, "scheduler.json");
};

exports.Scheduler.prototype.loadAndStart = function() {
    var self = this;
    lfs.readObjectsFromFile(this.filename, function(objects) {
        objects.forEach(function(action) {
            self.scheduleURL(new Date(action.at), action.serviceId, action.url);
        });
    });
}

exports.Scheduler.prototype.savePending = function() {
    var data = "";
    for(var i = 0; i < this.scheduledActions.length; ++i) {
        if (this.scheduledActions[i].type == SCHEDULE_ACTION_URI)  {
            data += JSON.stringify(this.scheduledActions[i]) + '\n';
        }
    }
    fs.writeFileSync(this.filename, data);
}

exports.Scheduler.prototype.scheduleURL = function(atTime, serviceID, callbackURL) {
    if(callbackURL.substr(0,1) != "/") callbackURL = "/"+callbackURL; // be flexible in what you take
    var trackingInfo = {
        at:atTime,
        type:SCHEDULE_ACTION_URI,
        serviceId:serviceID,
        url:callbackURL
    };
    this.scheduledActions.push(trackingInfo);
    if (typeof(atTime) == "number") {
        runTime = new Date;
        runTime.setTime(runTime.getTime() + atTime);
        atTime = runTime;
    }
    var milliseconds = atTime.getTime() - Date.now();
    if (milliseconds < 0) milliseconds = 0;

    var self = this;
    function runUrl() {
        request.get({url:lconfig.lockerBase + "/Me/" + serviceID + callbackURL}, function() {
            self.scheduledActions.splice(self.scheduledActions.indexOf(trackingInfo));
            self.savePending();
        });
    }
    setTimeout(function() {
        if (!serviceManager.map(serviceID)) {
            self.scheduledActions.splice(self.scheduledActions.indexOf(trackingInfo));
            self.savePending();
        } else {
            if (!serviceManager.isRunning(serviceID)) {
                serviceManager.spawn(serviceID, runUrl);
            } else {
                runUrl();
            }
        }
    }, milliseconds);
}

exports.Scheduler.prototype.scheduleInternal = function(atTime, callback) {
    if (typeof(atTime) == "number") {
        runTime = new Date;
        runTime.setTime(runTime.getTime() + atTime);
        atTime = runTime;
    }
    var trackingInfo = {
        at:atTime,
        type:SCHEDULE_ACTION_DIRECT,
        cb:callback
    };
    var self = this;
    this.scheduledActions.push(trackingInfo);
    var now = new Date;
    setTimeout(function() {
        self.scheduledActions.splice(self.scheduledActions.indexOf(trackingInfo));
        self.savePending();
        trackingInfo.cb();
    }, trackingInfo.at.getTime() - now.getTime());
}

/**
* Register a callback for a given time
*
* There are two ways that this may be called.  For both methods the first argument
* is always a date object that the action should be fired at or as close to as
* possible.
*
* For a direct internal function callback the second argument is the callback to be
* fired when the time is hit.
*
* For a service URI callback the second argument is the service id to call into and
* the third argument is the URI path to call.
*/
exports.Scheduler.prototype.at = function() {
    if (arguments.length == 2) {
        this.scheduleInternal.apply(this, arguments);
    } else if (arguments.length == 3) {
        this.scheduleURL.apply(this, arguments);
    } else {
        console.error("Invalid scheduler call.");
    }
    this.savePending();
}

exports.masterScheduler = new exports.Scheduler;

