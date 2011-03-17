/**
 * Module dependencies.
 */
require.paths.push(__dirname + "/Common/node");

var fs = require('fs'),
    path = require('path'),
    express = require('express'),
    connect = require('connect'),
    lfs = require('../../Common/node/lfs.js'),
    app = express.createServer(
        connect.bodyDecoder(),
        connect.cookieDecoder(),
        connect.session({secret : "locker"})),
    crypto = require('crypto'),
    spawn = require('child_process').spawn,
    sys = require('sys'),
    sort = require('../../Common/node/sort.js').quickSort;

var me, latests;    

app.get('/', 
function(req, res) {
    console.log('chrome /');
    res.end("hello chrome");
});

app.post('/urls',
function(req, res) {
    console.log('/urls');
    var stream = fs.createWriteStream('history.json');
//    console.log('body: ' + JSON.stringify(req.body));
    var json = JSON.parse(req.body.urls);
    sort(json, function(url1, url2) {
        if(url1.visitTime < url2.visitTime)
            return -1;
        else if(url1.visitTime > url2.visitTime)
            return 1;
        return 0;
    });
    for(var i = 0; i <  json.length; i++) {
        stream.write(JSON.stringify(json[i]) + '\n');
    }
    latests.latest = json[0];
    latests.oldest = json[json.length - 1];
    lfs.writeObjectToFile('latests.json', latests);
    stream.end();
    res.end('1');
});

app.get('/latest', 
function(req, res) {
    console.log('/latest');
    res.end(JSON.stringify(latests.latest));
});

app.get('/plugin', function(req, res) {
    res.redirect('http://localhost:' + port + '/plugindl');
});

app.get('/plugindl', function(req, res) {
    res.download(crxName);
});


function serveFile(filename, response) {
        console.log('servefile! ' + filename);
        response.sendfile(filename);
}

var crxName, port;
var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    process.chdir(processInfo.workingDirectory);
    lfs.readObjectFromFile('latests.json', function(newLatests) {
        latests = newLatests;
        me = lfs.loadMeData();
        port = processInfo.port;
        var returnedInfo = {port: processInfo.port};
        createCrx(function(name) {
            crxName = name + '.crx';
        });
        app.listen(processInfo.port);
        console.log(JSON.stringify(returnedInfo));
    });
});


var manifest = function(){ return '{\n' +
'  "name": "Locker Browser History",\n' +
'  "version": "0.1.1",\n' +
'  "description": "Locker Chrome browser History",\n' +
'  "background_page" : "background.html",\n' +
'  "permissions": [\n' +
'    "' + me.uri + '",\n' +
'    "http://code.jquery.com/",\n' +
'    "history"\n' +
'  ]\n' +
'}\n'; };
var background = function() { return '<script src="http://code.jquery.com/jquery-1.4.2.min.js"></script>\n<script>\nfunction postHistory() {\n  chrome.history.search({\'text\':\'\', \'maxResults\':10000, \'startTime\':0}, function(urls) {\n    $.post(\'' + me.uri + 'urls\', {urls:JSON.stringify(urls)}, function(data) {\n      alert(\'posted data!\');\n    }, \'UTF-8\');\n    });\n  }\n  function getLatest(callback) {\n    $.get(url + endpoint + \'/latest\',callback);\n  }\n  postHistory();\n</script>'; };

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
    var dirName = crypto.createHash('sha1').update(Math.random()).digest('hex');
    fs.mkdirSync(dirName, 0755);
    fs.writeFileSync(dirName + '/manifest.json', manifest());
    fs.writeFileSync(dirName + '/background.html', background());
    fs.writeFileSync('crxmake.sh', make);
    fs.chmodSync('crxmake.sh', 0750);

    var cwd = process.cwd();
    var lockerDir = cwd.substring(0, cwd.lastIndexOf('/Me/')) + '/';
    sys.debug('./crxmake.sh ' + dirName + ' ' + lockerDir + 'Me/key');
    crxMake = spawn('./crxmake.sh', [dirName, lockerDir + 'Me/key']);
    crxMake.stdout.on('data',function (data){sys.debug(data);});
    crxMake.stderr.on('data',function (data){sys.debug('Error:'+data);});
    crxMake.on('exit', function (code) {
        sys.debug('packed!');
        if(callback)
            callback(dirName);
    });
}
