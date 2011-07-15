var http = require('http');

var options = {
    host: 'localhost',
    port: 9200
};

exports.map = function(type) {
    // dynamic loading of mapper
    console.log('Loading Elasticsearch mapping for ' + type);
    require('./mapper-' + type + '.js').map(options);
};

exports.index = function(id, type, body, callback) {
    console.log('Indexing ' + type + ' ID ' + id);
    options.path = '/locker/' + type + '/' + id;
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

    req.end(JSON.stringify(body));
};

exports.search = function(type, term, offset, limit, callback) {
    options.path = '/locker/' + type + '/_search?q=' + term;
    options.method = 'GET';
    
    console.log('Searching ' + options.path);

    var data = '';
    var req = http.get(options, function(res) {
        res.setEncoding('utf8');
        
        res.on('data', function(chunk) {
            data += chunk;
        });

        res.on('end', function() {
            callback(null, JSON.parse(data));
        });
    });
    
    req.on('error', function(err) {
        console.error('problem with request: ' + e.message);
        callback(err);
    });
};