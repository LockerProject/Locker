/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

/**
 * Module dependencies.
 */
require.paths.push(__dirname + "/Common/node");

var fs = require('fs'),
    path = require('path'),
    express = require('express'),
    connect = require('connect'),
    lfs = require('../../Common/node/lfs.js'),
    lconfig = require('../../Common/node/lconfig.js'),
    app = express.createServer(
        connect.bodyParser(),
        connect.cookieParser(),
        connect.session({secret : "locker"})),
    crypto = require('crypto'),
    spawn = require('child_process').spawn,
    sys = require('sys'),
    sort = require('../../Common/node/sort.js').quickSort,
    sqlite = require('sqlite');

var externalBase, latests;    

app.get('/', 
function(req, res) {
    res.end("<html>great! do you need to <a href='plugin'>install the plugin</a></html>?");
});

app.post('/urls',
function(req, res) {
    var json = JSON.parse(req.body.urls);
    if(!json || json.length < 1)
        return;
    sys.debug('got ' + json.length + ' urls');
    insertUrls(json, function() {
        res.end('1');
        sys.debug('sent response');
    });
});

function insertUrls(URLs, callback) {
    if(!URLs || URLs.length < 1) {
        callback();
        return;
    }
    var url = URLs.pop();
    insertURL(url, function(error, rows) {
        insertUrls(URLs, callback);
    });
}

var columns = ['id', 'refferingVisitId', 'transition', 'visitId', 'visitTime', 'url', 'title'];

function createTable(callback) {
    db.execute("CREATE TABLE chromeHistory (id INTEGER, referringVisitId INTEGER, transition TEXT, visitId INTEGER PRIMARY KEY, visitTime REAL, url TEXT, title TEXT);", function(error) {
        callback();
    });
}

function insertURL(url, callback) {
    if(!url) callback();
    var values = [];
    for(var i in columns) {
        if(url[columns[i]])
            values.push(url[columns[i]]);
        else 
            values.push(null);
    }
    
    var sql = 'INSERT OR REPLACE INTO chromeHistory (id, referringVisitId, transition, visitId, visitTime, url, title) VALUES (?, ?, ?, ?, ?, ?, ?);';
    db.execute(sql, values, function(error, rows) {
        if(error) throw error;
        if(callback) callback(error, rows);
    });
}

function getURL(visitId, callback) {
    var sql = 'SELECT * FROM chromeHistory WHERE visitId = ?;';
    db.execute(sql, [visitId], callback);
}

function getURLs(callback) {
    var sql = 'SELECT * FROM chromeHistory;';
    db.execute(sql, callback);
}


app.get('/plugin', function(req, res) {
    //circumvent the still misbehaving proxy. [:(
    res.redirect('http://localhost:' + port + '/plugindl');
});

app.get('/plugindl', function(req, res) {
    createCrx(function(name) {
        var crxName = name + '.crx';
        res.download(crxName, 'locker-browser-history.crx', function() {
            fs.unlink(crxName);
        });
    });
});

app.get('/allLinks', function(req, res) {
    getURLs(function(error, rows) {
        if(error) throw error;
        res.end(JSON.stringify(rows));
    });
})
var port;
var stdin = process.openStdin();

var db = new sqlite.Database();


stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    process.chdir(processInfo.workingDirectory);
    db.open("history.db", function (error) {
        createTable(function () {
            externalBase = processInfo.externalBase;
            port = processInfo.port;
            var returnedInfo = {port: processInfo.port};
            app.listen(processInfo.port);
            console.log(JSON.stringify(returnedInfo));
        });
    });
});

var manifest = function(){ return '{\n' +
'  "name": "Locker Browser History",\n' +
'  "version": "0.1.1",\n' +
'  "description": "Locker Chrome browser History",\n' +
'  "background_page" : "background.html",\n' +
'  "permissions": [\n' +
'    "' + externalBase + '",\n' +
'    "http://code.jquery.com/",\n' +
'    "history"\n' +
'  ]\n' +
'}\n'; };
var background = function() {
    var cwd = process.cwd();
    var lockerDir = cwd.substring(0, cwd.lastIndexOf('/' + lconfig.me + '/')) + '/';
    var bg = fs.readFileSync(lockerDir + '/Connectors/ChromeHistory/extension/background.html');
    bg = bg.toString().replace('__INSERT_ME_DOT_URI_HERE__', externalBase);
    return bg;
};

var make = 'if test $# -ne 2; then\n' +
'  echo "Usage: crxmake.sh <extension dir> <pem path>"\n' +
'  exit 1\n' +
'fi\n' +
'dir=$1\n' +
'key=$2\n' +
'name=$(basename "$dir")\n' +
'crx="$name.crx"\n' +
'pub="$name.pub"\n' +
'sig="$name.sig"\n' +
'zip="$name.zip"\n' +
'trap \'rm -f "$pub" "$sig" "$zip"\' EXIT\n' +
'cwd=$(pwd -P)\n' +
'(cd "$dir" && zip -qr -9 -X "$cwd/$zip" .)\n' +
'openssl sha1 -sha1 -binary -sign "$key" < "$zip" > "$sig"\n' +
'openssl rsa -pubout -outform DER < "$key" > "$pub" 2>/dev/null\n' +
'byte_swap () {\n' +
'  echo "${1:6:2}${1:4:2}${1:2:2}${1:0:2}"\n' +
'}\n' +
'crmagic_hex="4372 3234" # Cr24\n' +
'version_hex="0200 0000" # 2\n' +
'pub_len_hex=$(byte_swap $(printf \'%08x\\n\' $(ls -l "$pub" | awk \'{print $5}\')))\n' +
'sig_len_hex=$(byte_swap $(printf \'%08x\\n\' $(ls -l "$sig" | awk \'{print $5}\')))\n' +
'(\n' +
'  echo "$crmagic_hex $version_hex $pub_len_hex $sig_len_hex" | xxd -r -p\n' +
'  cat "$pub" "$sig" "$zip"\n' +
') > "$crx"\n' +
'echo "Wrote $crx"\n';

function createCrx(callback) {
    var dirName = crypto.createHash('sha1').update(Math.random()+'').digest('hex');
    fs.mkdirSync(dirName, 0755);
    fs.writeFileSync(dirName + '/manifest.json', manifest());
    fs.writeFileSync(dirName + '/background.html', background());
    fs.writeFileSync('crxmake.sh', make);
    fs.chmodSync('crxmake.sh', 0750);

    var cwd = process.cwd();
    var lockerDir = cwd.substring(0, cwd.lastIndexOf('/' + lconfig.me + '/')) + '/';
    sys.debug('./crxmake.sh ' + dirName + ' ' + lockerDir + 'Me/key');
    crxMake = spawn('./crxmake.sh', [dirName, lockerDir + 'Me/key']);
    crxMake.stdout.on('data',function (data){sys.debug(data);});
    crxMake.stderr.on('data',function (data){sys.debug('Error:'+data);});
    crxMake.on('exit', function (code) {
        fs.unlink(dirName + '/manifest.json', function(err) {
            fs.unlink(dirName + '/background.html', function(err) {
                fs.rmdir(dirName, function(err) {
                    fs.unlink('crxmake.sh', function(err) {
                        if(callback)
                            callback(dirName);
                    });
                });
            });
        });
    });
}
