var request = require('request');
var url = require('url');
var locker = require('../../../../Common/node/locker.js');

exports.map = function(type) { };

exports.index = function(id, type, body, callback) {
    console.log('not implemented');
    callback(null, {result: 'ok'});
};

exports.search = function(type, term, offset, limit, callback) {
    
    locker.providers('search', function(error, providers) {
        if (!providers || providers.length === 0) {
            callback('No Locker search providers found', null);
        }
        
        // lame regex replacement of the incoming bad encoding from the form handling.  Ugly but effective
        term = term.replace(/&lt;/g, '<');
        term = term.replace(/&gt;/g, '>');
        term = term.replace(/&quot;/g, '"');

        var fetchURL = providers[0].uri + 'query?q='+encodeURIComponent(term);
        if (type !== '') {
          fetchURL += '&type=' + type;
        }

        request.get({url:fetchURL}, function(error, request, result) {
            if (error || !result) {
                callback('Failed calling provider GET at ' + fetchURL, null);
            }

            var results = {};
            var result = JSON.parse(result);
             
            results.hits = {};
            results.hits.total = result.hits.length;   
            results.took = result.took;
            results.hits.hits = result.hits;
        
            callback(null, results);
        });
    });
};