var http = require("http");
var url = require("url");
var serviceManager = require("lservicemanager");

var eventListeners = {};

exports.addListener = function(type, id, cb) {
    if (!eventListeners.hasOwnProperty(type)) eventListeners[type] = [];
    eventListeners[type].push({"id":id, "cb":cb});
}

exports.removeListener = function(type, id, cb) {
    if (!eventListeners.hasOwnProperty(type)) return;
    var pos = findListenerPosition(type, id, cb);
    if (pos >= 0) eventListeners[type].splice(pos, 1);
}

exports.fireEvent = function(type, id, obj) {
    if (!eventListeners.hasOwnProperty(type)) return;
    eventListeners[type].forEach(function(listener) {
        if (!serviceManager.isInstalled(listener.id)) return;
        function sendEvent() {
            var serviceInfo = serviceManager.metaInfo(listener.id);
            var cbUrl = url.parse(serviceInfo.uriLocal);
            var httpOpts = {
                host: cbUrl.hostname,
                port: cbUrl.port,
                path: listener.cb
            };
            http.get(httpOpts);
        }
        if (!serviceManager.isRunning(listener.id)) {
            serviceManager.spawn(listener.id, sendEvent);
        } else {
            sendEvent();
        }
    });
}

function findListenerPosition(type, id, cb) {
    for (var i = 0; i < eventListeners[type].length; ++i) {
        var listener = eventListeners[type][i];
        if (listener.id == id && listener.cb == cb) return i;
    }
    return -1;
}
