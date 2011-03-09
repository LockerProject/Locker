var lfs = require("lfs");
var fs = require("fs");
var serviceManager = require("lservicemanager");
var url = require("url");
var http = require("http");

SCHEDULE_ACTION_DIRECT = 0; // Live direct callbacks, not savable
SCHEDULE_ACTION_URI = 1; // Indirect service URIs, savable

exports.Scheduler = function() {
    this.scheduledActions = [];
    this.filename = "scheduler.json";
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
    var stream = fs.createWriteStream(this.filename, {'flags':'w', 'encoding': 'utf-8'});
    for(var i = 0; i < this.scheduledActions.length; ++i) {
        if (this.scheduledActions[i].type == SCHEDULE_ACTION_URI)  {
            stream.write(JSON.stringify(this.scheduledActions[i]) + '\n');
        }
    }
    stream.end();
}

exports.Scheduler.prototype.scheduleURL = function(atTime, serviceID, callbackURL) {
    var trackingInfo = {
        at:atTime,
        type:SCHEDULE_ACTION_URI,
        serviceId:serviceID,
        url:callbackURL
    };
    this.scheduledActions.push(trackingInfo);
    var seconds = atTime.getTime() - (new Date().getTime());
    if (seconds < 0) seconds = 0;
    var self = this;
    setTimeout(function() {
        var svc = serviceManager.metaInfo(serviceID);
        serviceManager.spawn(serviceID, function() {
            var cbUrl = url.parse(svc.uriLocal);
            var httpOpts = {
                host: cbUrl.hostname,
                port: cbUrl.port,
                path: callbackURL
            };
            http.get(httpOpts, function(res) {
                self.scheduledActions.splice(self.scheduledActions.indexOf(trackingInfo));
                self.savePending();
            });
        });
    }, seconds);
}

exports.Scheduler.prototype.scheduleInternal = function(atTime, callback) {
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

