lfs = require("lfs");
fs = require("fs");

SCHEDULE_ACTION_DIRECT = 0; // Live direct callbacks, not savable
SCHEDULE_ACTION_URI = 1; // Indirect service URIs, savable

exports.Scheduler = function() {
    this.scheduledActions = [];
    this.filename = "scheduler.json";
};

exports.Scheduler.prototype.loadAndStart = function() {
    var self = this;
    lfs.readObjectsFromFile(this.filename, function(objects) {
        self.scheduledActions.concat(objects);
    });
    // TODO: Start the pending events
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

exports.Scheduler.prototype.scheduleURI = function(serviceID, callBackURI) {

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
        var trackingInfo = {
            at:arguments[0],
            type:SCHEDULE_ACTION_DIRECT, 
            cb:arguments[1]
        };
        var self = this;
        this.scheduledActions.push(trackingInfo);
        var now = new Date;
        setTimeout(function() {
            self.scheduledActions.splice(self.scheduledActions.indexOf(trackingInfo));
            trackingInfo.cb();
        }, trackingInfo.at.getTime() - now.getTime());
    } else if (arguments.length == 3) {
        this.scheduledActions.push({type:SCHEDULE_ACTION_URI, serviceId:arguments[1], uri:arguments[2]});
    } else {
        console.error("Invalid scheduler call.");
    }
    this.savePending();
}

