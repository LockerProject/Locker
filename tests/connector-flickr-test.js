var assert = require("assert");
var vows = require("vows");
var RESTeasy = require("rest-easy");
var http = require("http");
var querystring = require("querystring");
var events = require("events");
var fs = require("fs");
var lfs = require('../Common/node/lfs.js');
var path = require('path');

var suite = RESTeasy.describe("Flickr API")

var id = '9fdfb7e5c6551dc45300aeb0d21fdff4';

suite.next().suite.addBatch({
    "can get photos from Flickr" : {
        topic:function() {
            var promise = new events.EventEmitter;
            var options = {
                host:"localhost",
                port:8042,
                path:'/Me/' + id + '/photos' 
            };
            fs.statSync('Me/' + id);
            http.get(options, function(res) {
                function checkForPhotos(retries) {
                    if(retries < 0) {
                        promise.emit("error", 'Photos did not download in time.');
                        return;
                    } 
                    setTimeout(function() {
                        fs.readdir('../Me/' + id + '/originals', function(err, files) {
                            if(err || !files || files.length != 2) {
                                checkForPhotos(retries - 1);
                                return;
                            }
                            fs.readdir('../Me/' + id + '/thumbs', function(err, files) {
                                if(err || !files || files.length != 2) {
                                    checkForPhotos(retries - 1);
                                    return;
                                }
                                fs.stat('../Me/' + id + '/state.json', function(err, stat) {
                                    if(err || !stat) {
                                        checkForPhotos(retries - 1);
                                        return;
                                    }
                                    fs.stat('../Me/' + id + '/photos.json', function(err, stat) {
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

suite.export(module);
