/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var assert = require("assert");
var vows = require("vows");
var RESTeasy = require("api-easy");
var http = require("http");
var querystring = require("querystring");
var events = require("events");
var fs = require("fs");
var lfs = require('../Common/node/lfs.js');
var locker = require('../Common/node/locker.js');
var lconfig = require('../Common/node/lconfig.js');
var path = require('path');

var suite = RESTeasy.describe("Flickr Connector");

var id = '9fdfb7e5c6551dc45300aeb0d21fdff4';

lconfig.load('Config/config.json');

locker.initClient({lockerUrl:lconfig.lockerBase, workingDirectory:lconfig.me + "/flickr-event-collector"});
locker.listen('photo/flickr', 'event');

suite.next().suite.addBatch({
    "Flickr Connector can get photos from Flickr" : {
        topic:function() {
            var promise = new events.EventEmitter;
            var options = {
                host:lconfig.lockerHost,
                port:lconfig.lockerPort,
                path:'/Me/' + id + '/photos' 
            };
            fs.statSync(lconfig.me + '/' + id);
            http.get(options, function(res) {
                function checkForPhotos(retries) {
                    if(retries < 0) {
                        promise.emit("error", 'Photos did not download in time.');
                        return;
                    } 
                    setTimeout(function() {
                        fs.readdir(lconfig.me + '/' + id + '/originals', function(err, files) {
                            if(err || !files || files.length != 2) {
                                checkForPhotos(retries - 1);
                                return;
                            }
                            fs.readdir(lconfig.me + '/' + id + '/thumbs', function(err, files) {
                                if(err || !files || files.length != 2) {
                                    checkForPhotos(retries - 1);
                                    return;
                                }
                                fs.stat(lconfig.me + '/' + id + '/state.json', function(err, stat) {
                                    if(err || !stat) {
                                        checkForPhotos(retries - 1);
                                        return;
                                    }
                                    fs.stat(lconfig.me + '/' + id + '/photos.json', function(err, stat) {
                                        if(err || !stat) {
                                            checkForPhotos(retries - 1);
                                            return;
                                        }
                                        promise.emit("success", true);
                                    });
                                });
                            });
                        });
                    }, 1000);
                }
                checkForPhotos(60);
            }).on("error", function(e) {
                promise.emit("error", e);
            });
            return promise;
        },
        "and returns within 60 seconds":function(err, stat) {
            assert.isNull(err);
        }
    }
});

// this test needs to be rewritten to use the regular event collector
//
// var eventCollectorID = 'flickr-event-collector';
// suite.next().suite.addBatch({
//     "Flickr Connector emits events" : {
//         topic:function() {
//             var promise = new events.EventEmitter;
//             function checkForEvents(retries) {
//                 if(retries < 0) {
//                     promise.emit("error", 'Events did not emit in time.');
//                     return;
//                 }
//                 setTimeout(function() {
//                     fs.readFile(lconfig.me + '/' + eventCollectorID + '/events', function(err, data) {
//                         if(err || data != '2') {
//                             checkForEvents(retries - 1);
//                             return;
//                         }
//                         promise.emit("success", true);
//                     });
//                 }, 100);
//             }
//             checkForEvents(30);
//             return promise;
//         },
//         "within 3 seconds":function(err, stat) {
//             assert.isNull(err);
//         }
//     }
// });

var photos = [];
var photoID = '5577555595';

suite.next().use(lconfig.lockerHost, lconfig.lockerPort)
    .discuss("Flicker Connector")
        .discuss("can get all photos")
            .path('/Me/' + id + '/allPhotos')
            .get()
                .expect(200)
                .expect("returns two photos", function(err, res, body) {
                    photos = JSON.parse(body);
                    assert.equal(photos.length, 2);
                })
            .unpath()
        .undiscuss()
    .undiscuss();


suite.next().use(lconfig.lockerHost, lconfig.lockerPort)
    .discuss("Flicker Connector")
        .discuss("can get an individual photo object")
            .path('/Me/' + id + '/photoObject/' + photoID)
            .get()
                .expect(200)
                .expect("returns the correct photo object", function(err, res, body) {
                    assert.equal(JSON.parse(body).id, photoID);
                    assert.equal(body, JSON.stringify(photos[0]));
                })
            .unpath()
        .undiscuss()
        .discuss("can get an individual photo file")
            .path('/Me/' + id + '/photo/' + photoID)
            .get()
                .expect(200)
                //TODO: this should at least check to see if the file is the right length
//                .expect("returns a photo ", function(err, res, body) {
//                    console.log(body.length);
//                    assert.isNotNull(body);
//                    assert.equal(JSON.parse(body).id, photoID);
//                    assert.equal(body, JSON.stringify(photos[0]));
//                })
            .unpath()
        .undiscuss()
    .undiscuss();

suite.export(module);
