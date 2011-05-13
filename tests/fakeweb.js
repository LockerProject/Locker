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
            var resp = fs.readFileSync(interceptedUris[options.uri]);
            return callback(null, response, resp);
        }
        if (allowNetConnect == false) {
            if (allowLocalConnect == true && url.parse(options.uri).host == "localhost") {
                return oldRequest.call(http, options, callback);
            }
            throw "Unhandled GET request to " + options.uri;
        } else {
            return oldRequest.call(request, options, callback);
        }
    }
    registerUri = function(uri, response) {
        interceptedUris[uri] = response;
    }
    cleanRegistry = function() {
        interceptedUris = {};
    }
    return this;
};

module.exports = Fakeweb();