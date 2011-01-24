var fs = require('fs');

exports.appendObjectsToFile = function(path, objects) {
    var stream = fs.createWriteStream(path, {'flags':'a'});
    for(i in objects) {
        stream.write(JSON.stringify(objects[i] + '\n'));
    }
    stream.end();
}

exports.writeMetadata = function(accountID, metadata) {
    if(!accountID) 
        throw new Error();
    fs.mkdirSync('my', 0755);
    fs.mkdirSync('my/' + accountID, 0755);
    fs.writeFileSync('my/' + accountID + '/meta.json', JSON.stringify(metadata));
}

exports.readMetadata = function(accountID) {
    var subDirNames;
    if(accountID)
        subDirNames = [accountID];
    else
        subDirNames = listSubdirectories('my');
    for(i in subDirNames) {
        try {
            return JSON.parse(fs.readFileSync('my/' + subDirNames[i] + '/meta.json'));
        } catch(err) {}
    }
    return null;
}

exports.writeURLContentsToFile = function(accountID, url, filename, encoding) {
    console.log('writeURLContentsToFile');
    wwwdude_client.get(url)
    .addListener('error',
    function(err) {
        sys.puts('Network Error: ' + sys.inspect(err));
    })
    .addListener('http-error',
    function(data, resp) {
        sys.puts('HTTP Error for: ' + resp.host + ' code: ' + resp.statusCode);
    })
    .addListener('success',
    function(data, resp) {
        console.log('my/' + accountID + '/' + filename);
        fs.writeFileSync('my/' + accountID + '/' + filename, data, encoding);
    }).send();
}

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