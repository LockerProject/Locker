var fs = require('fs'),
    request = require('request'),
    url = require('url'),
    https = require('https'),
    http = require('http'),
    EventEmitter = require('events').EventEmitter;
    
var allowNetConnect = true,
    allowLocalConnect = true,
    interceptedUris = {};
    

    
function interceptable(uri) {
    if (interceptedUris[uri]) {
        return true;
    }
    if (allowNetConnect == false) {
        if (uri) {
            if (allowLocalConnect == true && url.parse(uri).host == "localhost") {
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

function httpModuleRequest(uri) {
    var thisRequest = new EventEmitter();
    thisRequest.end = function() {
        var thisResponse = new EventEmitter();
        thisResponse.setEncoding = function() {};
        thisResponse.statusCode = interceptedUris[uri].statusCode;
        thisRequest.emit('response', thisResponse);
        
        thisResponse.emit('data', interceptedUris[uri].response);
        thisResponse.emit('end');
    }
    return thisRequest;
}

function Fakeweb() {
    var oldRequestGet = request.get;
    request.get = function(options, callback) {
        if (interceptable(options.uri)) {
            return callback(null, {statusCode : interceptedUris[options.uri].statusCode}, interceptedUris[options.uri].response);
        } else {
            return oldRequestGet.call(request, options, callback);
        }
    }
    
    var oldRequestPost = request.post;
    request.post = function(options, callback) {
        if (interceptable(options.uri)) {
            return callback(null, {statusCode : interceptedUris[options.uri].statusCode}, interceptedUris[options.uri].response);
        } else {
            return oldRequestPost.call(request, options, callback);
        }
    }
    var oldHttpsRequest = https.request;
    https.request = function(options, callback) {
        var uri = "https://" + options.host + ":" + options.port + options.path;
        if (interceptable(uri)) {
            return httpModuleRequest(uri);
        } else {
            return oldHttpsRequest.call(https, options, callback);
        }
    }
    var oldHttpRequest = http.request;
    http.request = function(options, callback) {
        var uri = "http://" + options.host + ":" + options.port + options.path;
        if (interceptable(uri)) {
            return httpModuleRequest(uri);
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
    }
    return this;
};

module.exports = Fakeweb();