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
            return callback('No Locker search providers found', null);
        }

        // lame regex replacement of the incoming bad encoding from the form handling.  Ugly but effective
        term = term.replace(/&lt;/g, '<');
        term = term.replace(/&gt;/g, '>');
        term = term.replace(/&quot;/g, '"');

        var fetchURL = providers[0].uri + 'query?q='+encodeURIComponent(term)+"&limit="+limit;
        if (type !== '') {
          fetchURL += '&type=' + type;
        }

        request.get({url:fetchURL}, function(error, res, body) {
            var results = {};
            if (error || !res) {
                results.error = 'Failed calling provider GET at ' + fetchURL;
                return callback(results.error, results);
            }

            else if (res.statusCode >= 300) {
                results.error = 'That\'s an invalid query term, try again!';
                return callback(results.error, results);
            }
            else {
                var result = JSON.parse(body);
                results.hits = {};
                results.hits.total = result.hits.length;
                results.took = result.took;
                results.hits.hits = result.hits;
                results.error;
                callback(null, results);
            }
        });
    });
};