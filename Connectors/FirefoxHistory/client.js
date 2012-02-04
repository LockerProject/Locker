/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs      = require('fs'),
    sqlite  = require('sqlite'),
    express = require('express'),
    connect = require('connect'),
    spawn   = require('child_process').spawn,
    lfs     = require('../../Common/node/lfs.js'),
    locker  = require('../../Common/node/locker.js');

var db = new sqlite.Database();
var app = express.createServer(
    connect.bodyParser(),
    connect.cookieParser(),
    connect.session({secret: "locker"})
);

app.get('/', function(req, res) {
    res.end("<html>we'll be chugging away...</html>");
    
    // TODO: Check for existing JSON dump and update if exists
    fs.mkdir('my', 0755);

    var ff_profiles_dir = null;
    switch (process.platform) {
    // TODO: Add paths for other platforms
    case "darwin":
        ff_profiles_dir = process.env.HOME +
            '/Library/Application Support/Firefox/Profiles';
        break;
    default:
        break;
    }

    if (ff_profiles_dir) {
        var files = fs.readdirSync(ff_profiles_dir);
        for (var i = 0; i < files.length; i++) {
            var profile = files[i].split('.');

            // Only grab data from default profile
            // TODO: Allow user to configure multiple sources
            if (profile[1] != "default")
                continue;

            var fullPath = ff_profiles_dir + '/' + files[i];
            var stats = fs.statSync(fullPath);
            if (!stats.isDirectory())
                continue;

            copyAndExtract(profile[1], fullPath);
        }
    }
});

app.get('/allLinks', function(req, res) {
    lfs.readObjectsFromFile('my/default/history.json', function(links) {
        res.end(JSON.stringify(links));
    });
});

function copyAndExtract(accountID, fullPath) {
    var copy = spawn('cp', [fullPath + '/places.sqlite', 'places.sqlite']);
    
    copy.stderr.on('data', function(data) {
        console.log('Error while copying: ' + data);
    });

    copy.on('exit', function(code) {
        if (code != 0) return;
        fs.mkdir('my/' + accountID, 0755);

        var stream = fs.createWriteStream('my/' + accountID + '/history.json');
        db.open('places.sqlite', function (error) {
            if (error) {
                console.log("Tonight. You.");
                throw error;
            }
            
            var sql = 'SELECT * FROM moz_places';
            db.prepare(sql, function (error, statement) {
                if (error) throw error;
                statement.fetchAll(function (error, rows) {
                    for (var i = 0; i < rows.length; i++) {
                        stream.write(JSON.stringify(rows[i]) + '\n');
                    }
                    stream.end();
                 
                    statement.finalize(function (error) {
                        console.log("All done!");
                    });

                    var rem = spawn('rm', ['-f',
                        'places.sqlite',
                        'places.sqlite-shm',
                        'places.sqlite-wal'
                    ]);
                    rem.on('exit', function() {});
                });
            });
        });
    });
}

var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function(chunk) {
    var processInfo = JSON.parse(chunk);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    app.listen(processInfo.port);
    var returnedInfo = {port: processInfo.port};
    console.log(JSON.stringify(returnedInfo));
});

