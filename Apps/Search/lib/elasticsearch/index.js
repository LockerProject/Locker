var http = require('http');

var options = {
    host: 'localhost',
    port: 9200
};

exports.index = function(id, type, body, callback) {
    // dynamic loading of mapper
    console.log('Loading Elasticsearch mapping for ' + type);
    require('./mapper-' + type + '.js').map();

    console.log('Indexing ' + type + ' ID ' + id);
    options.path = '/' + type + '/' + id;
    options.method = 'POST';
    
    var result;
    var req = http.request(options, function(res) {
        res.setEncoding('utf8');
        
        res.on('data', function (chunk) {
            result += chunk;
        });
        
        res.on('end', function() {
            callback(null, result);
        });
    });

    req.on('error', function(err) {
        console.error('problem with request: ' + e.message);
        callback(err);
    });

    req.end(body);
};

exports.search = function(type, term, offset, limit, callback) {
    options.path = '/' + type + '/_search?from:' + offset + '&size:' + limit + '&q:' + term;
    options.method = 'GET';

    var result;
    var req = http.request(options, function(res) {
        res.setEncoding('utf8');

        res.on('data', function(chunk) {
            result += chunk;
        });

        res.on('end', function() {
            callback(null, result);
        });
    });
    
    req.on('error', function(err) {
        console.error('problem with request: ' + e.message);
        callback(err);
    });
};