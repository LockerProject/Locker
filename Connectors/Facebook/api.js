/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var lfs = require('../../Common/node/lfs.js');
var fs = require('fs');
    
module.exports = function(app) {
    
app.get('/allContacts',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });
    lfs.readObjectsFromFile('contacts.json', function(contacts) {
        res.write(JSON.stringify(contacts));
        res.end();
    });
});


app.get('/allPhotos',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });
    fs.readdir('photos/Me', function(err, files) {
        var photoAlbums = [];
        function readNext(callback) {
            var file = files.pop();
            sys.debug('reading file ' + file)
            lfs.readObjectFromFile('photos/Me/' + file + "/meta.json", function(albumInfo) {
                photoAlbums.push(albumInfo);
                if(files.length > 0)
                    readNext(callback);
                else {
                    callback();
                    return;
                }
            });
        }
        readNext(function() {
            res.end(JSON.stringify(photoAlbums));
        });
    });
});


app.get('/getfeed',
function(req, res) {
    lfs.readObjectsFromFile('feed.json', function(data) {
        var obj = {};
        obj.data = data;
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.write(JSON.stringify(obj));
        res.end();
    });
});

}