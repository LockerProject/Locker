/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs'),
    sys = require('sys'),
    url = require('url'),
    https = require('https'),
    http = require('http'),
    spawn = require('child_process').spawn;

/**
 * Appends an array of objects as lined-delimited JSON to the file at the specified path
 */
exports.appendObjectsToFile = function(path, objects) {
    var stream = fs.createWriteStream(path, {'flags':'a', 'encoding': 'utf8'});
    for(var i = 0; i < objects.length; i++)
        stream.write(JSON.stringify(objects[i]) + '\n');
    stream.end();
}

/**
 * Writes an array of objects as lined-delimited JSON to the file at the specified path
 */
exports.writeObjectsToFile = function(path, objects) {
    var stream = fs.createWriteStream(path, {'encoding': 'utf8'});
    for(var i = 0; i < objects.length; i++)
        stream.write(JSON.stringify(objects[i]) + '\n');
    stream.end();
}

/**
 * Reads an array of objects as lined-delimited JSON from the file at the specified path
 */
exports.readObjectsFromFile = function(path, callback) {
    var stream = fs.createReadStream(path, {'encoding': 'utf8'});
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
    var stream = fs.createReadStream(path, {'encoding': 'utf8'});
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

exports.saveUrl = function(requestURL, filename, callback) {
    var port = (url.parse(requestURL).protocol == 'http:') ? 80 : 443;
    var host = url.parse(requestURL).hostname;
    var client;
    if(port == 80) 
        client = http;
    else 
        client = https;
    var parsedUrl = url.parse(requestURL, true);

    var request = client.get({ host: host, port:port, path: (parsedUrl.pathname + parsedUrl.search)}, function(res) {
        var downloadfile = fs.createWriteStream(filename);
        res.pipe(downloadfile);
        res.on('end', function() {
            callback();
        });
    })
    request.on('error', function(error) {
        console.log('errorrs!!! '+requestURL);
    });
}

/**
 * Lists the subdirectories at the specified path
 */
function listSubdirectories(path) {
    var files = fs.readdirSync(path);
    var dirs = [];
    for(var i in files) {    
        var fullPath = path + '/' + files[i];
        var stats = fs.statSync(fullPath);
        if(!stats.isDirectory())
            continue;
        dirs.push(files[i]);
    }
    return dirs;
}