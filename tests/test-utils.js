var vows = require("vows");
var assert = require("assert");
var events = require("events");

exports.timeoutAsyncCallback = function(timeout, startCallback, runCallback) {
    var context = {
        topic: function (topic) {
            var emitter = new(events.EventEmitter)
            var fired = false;
            startCallback(topic, timeout, function() {
                if (runCallback) {
                    fired = runCallback();
                } else {
                    fired = true;
                }
            });
            setTimeout(function() {
                if (fired) {
                    emitter.emit("success", true);
                } else {
                    emitter.emit("error", new Error("timeout"));
                }
            }, timeout*2);
            return emitter;
        }
    }
    context["and fires the callback in a timely fashion"] = function(err, fired) {
        assert.isNull(err);
        assert.isTrue(fired);
    }
    return context;
}

