/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fs = require('fs'),
    lfs = require("lfs"),
    dataStore = require('connector/dataStore'),
    validTypes = [];


module.exports = function(app, id, mongo) {

for (var i in mongo.collections) {
    validTypes.push(i);
}

dataStore.init(id, mongo);

// In adherence with the contact/* provider API
// Returns a list of the current set of friends or followers
app.get('/getCurrent/:type', function(req, res) {
    var type = req.params.type;
    var options = {};
    if(req.query['limit']) options.limit = req.query['limit'];
    if(req.query['skip']) options.skip = req.query['skip'];

    if (validTypes.indexOf(type) === -1) {
        res.writeHead(404, {'content-type' : 'application/json'});
        res.end('{error: type not found}');
    } else {
        dataStore.getAllCurrent(req.params.type, function(err, objects) {
            if (err) {
                res.writeHead(500, {'content-type' : 'application/json'});
                res.end('{error : ' + err + '}')
            } else {
                res.writeHead(200, {'content-type' : 'application/json'});
                res.end(JSON.stringify(objects));
            }
        }, options);
    }
});

app.get('/get_profile', function(req, res) {
    lfs.readObjectFromFile('profile.json', function(userInfo) {
        res.writeHead(200, {"Content-Type":"application/json"});
        res.end(JSON.stringify(userInfo));        
    });
});

app.get('/getPhoto/:id', function(req, res) {
    fs.readdir('photos', function(err, files) {
        var file;
        for (var i = 0; i < files.length; i++) {
            if (files[i].match(req.param('id'))) {
                file = files[i];
            }
        }
        if (file) {
            var stream = fs.createReadStream('photos/' + file);
            var head = false;
            stream.on('data', function(chunk) {
                if(!head) {
                    head = true;
                    res.writeHead(200, {'Content-Disposition': 'attachment; filename=' + file});
                }
                res.write(chunk, "binary");
            });
            stream.on('error', function() {
                res.writeHead(404);
                res.end();
            });
            stream.on('end', function() {
                res.end();
            });
        } else {
            res.writeHead(404);
            res.end();
        }
    });
});

}