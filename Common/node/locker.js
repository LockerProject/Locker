var wwwdude = require('wwwdude'),
    request = require('request'),
    sys = require('sys'),
    http = require("http"),
    url = require("url"),
    lconfig = require(__dirname + "/lconfig.js"),
    client = wwwdude.createClient();

var lockerBaseURI = 'http://localhost:8042';

exports.at = function(uri, delayInSec) {
    //this should be migrated to request.get
    client.get(lockerBaseURI + '/at?uri=' + escape(uri) + '&at=' + (new Date().getTime() + (delayInSec * 1000)));
}

exports.map = function(callback) {
    //this should be migrated to request.get
    client.get(lockerBaseURI + '/map').addListener('success', function(data, resp) {
        if(data)
            callback(JSON.parse(data));
        else
            callback();
    });
}

/**
 * Post an event
 * id - the ID of the service posting the event
 * type - the MIME-style type of the object (e.g. photo/flickr, message/IMAP, or link/firefox)
 * obj - the object to make a JSON string of as the event body
 */
exports.event = function(type, id, obj) {
    var urlInfo = url.parse(lconfig.lockerBase);
    var options = {
        method: "POST",
        host: urlInfo.hostname,
        port: urlInfo.port,
        path: "/event",
        headers: {
            "Content-Type":"application/json"
        }
    };
    var req = http.request(options);
    req.write(JSON.stringify({"id":id,"type":type,"obj":obj}));
    req.end();
}

/**
 * Sign up to be notified of events
 * type - the MIME-style type of the object (e.g. photo/flickr, message/IMAP, or link/firefox)
 * id - the ID of the service listening for events
 * callback - the URL path at the listener to callback to
 * 
 * for example, if our id is "foo" and we want to get a ping at "/photoListener" 
 * for photos from a flickr connector with id "bar", our call would look like this:
 * 
 * listen("photo/flickr", "foo", "/photoListener");
 */
exports.listen = function(type, id, callback) {
    request.get({url:lockerBaseURI + '/listen' + encodeParams({'type':type, 'id':id, 'cb':callback})}, function(error, response, body) {
        if(error) sys.debug(error);
    });
}

function encodeParams(params) {
    var str = "?";
    for(var key in params) {
        var value = params[key];
        if(value)
            str += encodeURIComponent(key) + "=" + encodeURIComponent(value) + "&"
    }
    return str.substring(0, str.length - 1);
}
