var fs = require('fs'),
    request = require('request'),
    url = require('url');

var Fakeweb = function() {
    interceptedUris = {};
    allowNetConnect = true;
    allowLocalConnect = true;
    oldRequest = request.get;
    request.get = function(options, callback) {
        response = {statusCode : 200}
        if (interceptedUris[options.uri]) {
            return callback(null, response, interceptedUris[options.uri]);
        }
        if (allowNetConnect == false) {
            if (options.uri) {
                if (allowLocalConnect == true && url.parse(options.uri).host == "localhost") {
                    return oldRequest.call(http, options, callback);
                }
                throw "Unhandled GET request to " + options.uri;
            } else {
                throw "Invalid request"
            }
        } else {
            return oldRequest.call(request, options, callback);
        }
    }
    cleanRegistry = function() {
        interceptedUris = {};
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