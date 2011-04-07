/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var sys    = require('sys'),
    sqlite = require('sqlite');

var db = new sqlite.Database();

// open the database for reading if file exists
// create new database file if not

var fs = require('fs');
var exec  = require('child_process').exec;

fs.mkdir('my', 0755);

function copyAndExtract(accountID) {
    child = exec('cp ' + process.env.HOME + '/Library/Application\\ Support/Firefox/Profiles/7v61pmci.default/places.sqlite places.sqlite', function(error, stdout, stderr) {
        fs.mkdir('my/' + accountID, 0755);
        var stream = fs.createWriteStream('my/' +accountID + '/history.json');
        db.open('places.sqlite', function (error) {
          if (error) {
              console.log("Tonight. You.");
              throw error;
          }
          var sql = 'SELECT * FROM moz_places';
      
          db.prepare(sql, function (error, statement) {
            if (error) throw error;
              statement.fetchAll(function (error, rows) {
                  for(var i = 0; i < rows.length; i++) {
                      stream.write(JSON.stringify(rows[i]) + '\n');
                  }
                  stream.end();
                  
                statement.finalize(function (error) {
                  console.log("All done!");
                });
                exec('rm places.sqlite', function() {});
              });
          });
      });
    });
}

var ff_profiles_dir = process.env.HOME + '/Library/Application Support/Firefox/Profiles/';
var files = fs.readdirSync(ff_profiles_dir);
for (var i = 0; i < files.length; i++) {
    var fullPath = ff_profiles_dir + '/' + files[i];
    var stats = fs.statSync(fullPath);
    if(!stats.isDirectory())
        continue;
    console.log('my/' + files[i]);
    copyAndExtract(files[i]);
}
