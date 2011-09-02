var fs = require('fs'),
    request = require('request'),
    url = require('url'),
    https = require('https'),
    http = require('http'),
    EventEmitter = require('events').EventEmitter;
    
var _allowNetConnect = true,
    _allowLocalConnect = true,
    interceptedUris = {},
    ignoredUris = {};
    

    
function interceptable(uri) {
    if (interceptedUris[uri]) {
        return true;
    }
    if (ignoredUris[uri]) {
        return false;
    }
    if (allowNetConnect === false) {
        if (uri) {
            if (allowLocalConnect === true && url.parse(uri).hostname == "localhost") {
                return false;
            }
            console.error("FAKEWEB: Unhandled GET request to " + uri);
            throw "FAKEWEB: Unhandled GET request to " + uri;
        } else {
            console.error("FAKEWEB: Invalid request");
            throw "FAKEWEB: Invalid request";
        }
    } else {
        return false;
    }
}

function httpModuleRequest(uri, callback) {
    var thisRequest = new EventEmitter();
    thisRequest.setEncoding = function() {};
    
    thisRequest.end = function() {
        var thisResponse = new EventEmitter();
        thisResponse.setEncoding = function() {};
        thisResponse.pipe = function(outputStream) {
            outputStream.write(interceptedUris[uri].response);
            outputStream.end();
        };
        thisResponse.statusCode = interceptedUris[uri].statusCode;
        if (interceptedUris[uri].contentType) {
            thisResponse.headers['content-type'] = interceptedUris[uri].contentType;
        }
        thisRequest.emit('response', thisResponse);
        
        if (callback) {
            callback(thisResponse);
        }
        
        thisResponse.emit('data', interceptedUris[uri].response);
        thisResponse.emit('end');
        thisResponse.emit('close');

    }
    return thisRequest;
}

function Fakeweb() {
    this.allowNetConnect = _allowNetConnect;
    this.allowLocalConnect = _allowLocalConnect;
    var oldRequestGet = request.get;
    request.get = function(options, callback) {
        var url = options.uri || options.url;
        if (interceptable(url)) {
            var resp = {statusCode : interceptedUris[url].statusCode};
            if (interceptedUris[url].contentType) {
                resp.headers = {'content-type' : interceptedUris[url].contentType};
            }
            return callback(null, resp, interceptedUris[url].response);
        } else {
            return oldRequestGet.call(request, options, callback);
        }
    }
    
    var oldRequestPost = request.post;
    request.post = function(options, callback) {
        var url = options.uri || options.url;
        if (interceptable(url)) {
            var resp = {statusCode : interceptedUris[url].statusCode};
            if (interceptedUris[url].contentType) {
                resp.headers = {'content-type' : interceptedUris[url].contentType};
            }
            return callback(null, resp, interceptedUris[url].response);
        } else {
            return oldRequestPost.call(request, options, callback);
        }
    }
    var oldHttpsRequest = https.request;
    https.request = function(options, callback) {
        var uri;
        if (options.port) {
            uri = "https://" + options.host + ":" + options.port + options.path;
        } else {
            uri = "https://" + options.host + options.path;
        }
        if (interceptable(uri)) {
            return httpModuleRequest(uri, callback);
        } else {
            return oldHttpsRequest.call(https, options, callback);
        }
    }
    var oldHttpRequest = http.request;
    http.request = function(options, callback) {
        var uri;
        if (options.port) {
            uri = "http://" + options.host + ":" + options.port + options.path;
        } else {
            uri = "http://" + options.host + options.path;
        }
        if (interceptable(uri)) {
            return httpModuleRequest(uri, callback);
        } else {
            return oldHttpRequest.call(http, options, callback);
        }
    }
    tearDown = function() {
        interceptedUris = {};
        allowNetConnect = true;
        allowLocalConnect = true;
        // request.get = oldRequestGet;
        // https.request = oldHttpsRequest;
        // http.request = oldHttpRequest;
    }
    registerUri = function(options) {
        interceptedUris[options.uri] = {};
        if (options.file) {
            interceptedUris[options.uri].response = fs.readFileSync(options.file);
        } else if (options.body) {
            interceptedUris[options.uri].response = options.body;
        }
        interceptedUris[options.uri].statusCode = options.statusCode || 200;
        interceptedUris[options.uri].contentType = options.contentType;
    }
    ignoreUri = function(options) {
        ignoredUris[options.uri] = true;
    }
    return this;
};

module.exports = Fakeweb();