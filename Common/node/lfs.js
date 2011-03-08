var fs = require('fs'),
    sys = require('sys');

var wwwdude = require('wwwdude');

/**
 * Appends an array of objects as lined-delimited JSON to the file at the specified path
 */
exports.appendObjectsToFile = function(path, objects) {
    var stream = fs.createWriteStream(path, {'flags':'a', 'encoding': 'utf-8'});
    for(var i = 0; i < objects.length; i++)
        stream.write(JSON.stringify(objects[i]) + '\n');
    stream.end();
}

/**
 * Writes an array of objects as lined-delimited JSON to the file at the specified path
 */
exports.writeObjectsToFile = function(path, objects) {
    var stream = fs.createWriteStream(path, {'encoding': 'utf-8'});
    for(var i = 0; i < objects.length; i++)
        stream.write(JSON.stringify(objects[i]) + '\n');
    stream.end();
}

/**
 * Reads an array of objects as lined-delimited JSON from the file at the specified path
 */
exports.readObjectsFromFile = function(path, callback) {
    var stream = fs.createReadStream(path, {'encoding': 'utf-8'});
    var data = "";
    stream.on('data', function(newData) {
        data += newData;
    });
    stream.on('end', function() {
        var itemStrings = data.split('\n');
        var items = [];
        for(var i = 0; i < itemStrings.length; i++) {
            if(itemStrings[i])
                items.push(JSON.parse(itemStrings[i]));
        }
        callback(items);
    });
    stream.on('error', function(err) {
        callback([]);
    });
}

/**
 * Reads an array of objects as lined-delimited JSON from the file at the specified path
 */
exports.readObjectFromFile = function(path, callback) {
    var stream = fs.createReadStream(path, {'encoding': 'utf-8'});
    var data = "";
    stream.on('data', function(newData) {
        data += newData;
    });
    stream.on('end', function() {
        var item = {};
        try {
            item = JSON.parse(data);
        } catch(err) {
        }
        callback(item);
    });
    stream.on('error', function(err) {
        callback({});
    });
}

exports.writeObjectToFile = function(path, object) {
    fs.writeFileSync(path, JSON.stringify(object));
}

/**
 * Writes the me object to the me file (me.json)
 */
exports.syncMeData = function(metadata) {
    fs.writeFileSync('me.json', JSON.stringify(metadata)); // write this back to locker service?
}

/**
 * Reads the metadata file (meta.json) from the specificed account, or the first one found
 * if no account is specified
 */
exports.loadMeData = function() {
    try {
        return JSON.parse(fs.readFileSync('me.json'));
    } catch(err) {
        return {};
    }
}

/**
 * Downloads the contents of a URL and saves it to the path, retrying if requested
 */
function writeURLContentsToFile(accountID, url, filename, encoding, retryCount) {
    if(!url || !accountID || !filename)
        return;
    var wwwdude_client = wwwdude.createClient({
        encoding: encoding
    });
    wwwdude_client.get(url)
    .addListener('error',
    function(err) {
        sys.puts('Network Error: ' + sys.inspect(err));
        if(retryCount > 0)
            writeURLContentsToFile(accountID, url, filename, encoding, retryCount - 1);
    })
    .addListener('http-error',
    function(data, resp) {
        sys.puts('HTTP Error for: ' + resp.host + ' code: ' + resp.statusCode);
        if(retryCount > 0)
            writeURLContentsToFile(accountID, url, filename, encoding, retryCount - 1);
    })
    .addListener('success',
    function(data, resp) {
        fs.writeFileSync('my/' + accountID + '/' + filename, data, encoding);
    });
}
/*exports.writeURLContentsToFile = function(accountID, url, filename, encoding, retryCount) {
    if(!retryCount)
        retryCount = 0;
    writeURLContentsToFile(accountID, url, filename, encoding, retryCount);
}*/

function writeContentsOfURLToFile(url, filename, retryCount, encoding) {
    if(!url || !filename)
        return;
    if(!retryCount)
        retryCount = 0;
    var wwwdude_client;
    if(encoding)
        wwwdude_client = wwwdude.createClient({
            encoding: encoding
        });
    else
        wwwdude_client = wwwdude.createClient();
        
    wwwdude_client.get(url)
    .addListener('error',
    function(err) {
        sys.puts('Network Error: ' + sys.inspect(err));
        if(retryCount > 0)
            writeContentsOfURLToFile(url, filename, retryCount - 1, encoding);
    })
    .addListener('http-error',
    function(data, resp) {
        sys.puts('HTTP Error for: ' + resp.host + ' code: ' + resp.statusCode);
        if(retryCount > 0)
            writeContentsOfURLToFile(url, filename, retryCount - 1, encoding);
    })
    .addListener('success',
    function(data, resp) {
        fs.writeFileSync(filename, data, encoding);
    });
}

exports.writeContentsOfURLToFile = function(url, filename, retryCount, encoding) {
    writeContentsOfURLToFile(url, filename, retryCount, encoding);
}
    

/**
 * Lists the subdirectories at the specified path
 */
function listSubdirectories(path) {
    var files = fs.readdirSync(path);
    var dirs = [];
    for(i in files) {    
        var fullPath = path + '/' + files[i];
        var stats = fs.statSync(fullPath);
        if(!stats.isDirectory())
            continue;
        dirs.push(files[i]);
    }
    return dirs;
}