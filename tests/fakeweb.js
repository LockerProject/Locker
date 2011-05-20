var fs = require('fs'),
    request = require('request'),
    url = require('url'),
    https = require('https'),
    http = require('http'),
    EventEmitter = require('events').EventEmitter;
    

    
function interceptable(uri) {
    if (interceptedUris[uri]) {
        return true;
    }
    if (allowNetConnect == false) {
        if (uri) {
            if (allowLocalConnect == true && url.parse(uri).host == "localhost") {
                return false;
            }
            throw "Unhandled GET request to " + uri;
        } else {
            throw "Invalid request";
        }
    } else {
        return false;
    }
}

var Fakeweb = function() {
    interceptedUris = {};
    allowNetConnect = true;
    allowLocalConnect = true;
    
    oldRequestGet = request.get;
    request.get = function(options, callback) {
        var response = {statusCode : 200};
        if (interceptable(options.uri)) {
            return callback(null, response, interceptedUris[options.uri]);
        } else {
            return oldRequestGet.call(request, options, callback);
        }
    }
    
    oldHttpsRequest = https.request;
    https.request = function(options, callback) {
        var uri = "https://" + options.host + ":" + options.port + options.path;
        if (interceptable(uri)) {
            var thisRequest = new EventEmitter();
            thisRequest.end = function() {
                var thisResponse = new EventEmitter();
                thisResponse.setEncoding = function() {};
                thisResponse.statusCode = 200;
                thisRequest.emit('response', thisResponse);
                
                thisResponse.emit('data', interceptedUris[uri]);
                thisResponse.emit('end');
            }
            return thisRequest;
        } else {
            return oldHttpsRequest.call(https, options, callback);
        }
    }
    // oldHttpRequest = http.request;
    // http.request = function(options, callback) {
    //     oldHttpRequest.call(http, options, callback);
    // }
    tearDown = function() {
        interceptedUris = {};
        allowNetConnect = true;
        allowLocalConnect = true;
        request.get = oldRequestGet;
        https.request = oldHttpsRequest;
        // http.request = oldHttpRequest;
    }
    registerUri = function(options) {
        if (options.file) {
            interceptedUris[options.uri] = fs.readFileSync(options.file);
        } else if (options.body) {
            interceptedUris[options.uri] = options.body;
        }
    }
    return this;
};

module.exports = Fakeweb();