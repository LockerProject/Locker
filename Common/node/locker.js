var wwwdude = require('wwwdude'),
    request = require('request'),
    sys = require('sys'),
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
 */
exports.event = function(id, type) {
    request.post({'url':lockerBaseURI + '/event' + encodeParams({'id':id, 'type':type})}, function(error, response, body) {
        if(error) sys.debug(error);
    });
}

/**
 * Sign up to be notified of events
 * id - the ID of the service posting the event
 * type - the MIME-style type of the object (e.g. photo/flickr, message/IMAP, or link/firefox)
 * from - the ID of the service listening for events
 * callback - the URL path at the listener to callback to
 * 
 * for example, if our id is "foo" and we want to get a ping at "/photoListener" 
 * for photos from a flickr connector with id "bar", our call would look like this:
 * 
 * listen("bar", "photo/flickr", "foo", "/photoListener");
 */
exports.listen = function(id, type, from, callback) {
    request.get({url:lockerBaseURI + '/listen' + encodeParams({'id':id, 'type':type, 'from':from, 'cb':callback})}, function(error, response, body) {
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