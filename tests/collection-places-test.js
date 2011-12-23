var fakeweb = require('node-fakeweb');
var dataStore = require('../Collections/Places/dataStore');
var sync = require('../Collections/Places/sync');
var assert = require("assert");
var RESTeasy = require('api-easy');
var vows = require("vows");
var suite = RESTeasy.describe("Places Collection");
var fs = require('fs');
var request = require('request');
var foursquareEvent = JSON.parse(fs.readFileSync('fixtures/events/places/foursquare.json','utf8'));
var twitterEvent = JSON.parse(fs.readFileSync('fixtures/events/places/twitter.json','utf8'));
var igEvent = JSON.parse(fs.readFileSync('fixtures/events/places/instagram.json','utf8'));
var twitterBBEvent = JSON.parse(fs.readFileSync('fixtures/events/places/twitterplaceonly.json','utf8'));

process.setMaxListeners(0);
process.on('uncaughtException',function(error){
    console.dir(error.stack);
});

var mePath = '/Data/places';
var pinfo = JSON.parse(fs.readFileSync(__dirname + mePath + '/me.json'));

var thecollections = ['place'];
var lconfig = require('../Common/node/lconfig');
lconfig.load("Config/config.json");
var locker = require(__dirname + "/../Common/node/locker");
locker.ievent = function(){};

var cwd = process.cwd();
var lmongo = require('../Common/node/lmongo.js');

suite.next().suite.addBatch({
    "Can process Twitter event" : {
        topic: function() {
            process.chdir("." + mePath);
            var self = this;
            lmongo.init("places", thecollections, function(mongo, colls) {
                dataStore.init(colls.place, mongo, locker);
                dataStore.addEvent(twitterEvent, self.callback);
            });
        },
        "successfully" : function(err, response) {
            assert.isNull(err);
            assert.equal(response.text, 'Wired: U.S. Drone Controllers Said To Be Infected By Computer Virus');
            assert.equal(response.id, '32ccd529146dfc30f2a318034c734ae01f1c0687');
        }
    }
}).addBatch({
    "Can process Foursquare event" : {
        topic: function() {
            dataStore.addEvent(foursquareEvent, this.callback);
        },
        "successfully" : function(err, response) {
            assert.isNull(err);
            assert.equal(response.at, 1303341763000);
            assert.equal(response.title, 'Singly Is Awesome');
        }
    }
}).addBatch({
    "Can process Instagram event" : {
        topic: function() {
            dataStore.addEvent(igEvent, this.callback);
        },
        "successfully" : function(err, response) {
            assert.isNull(err);
            assert.equal(response.at, 1319389551000);
            assert.equal(response.title, 'Cascade, our namesake');
        }
    }
}).addBatch({
    "Can handle Twitter bounding box for geo" : {
        topic: function() {
            var self = this;
            lmongo.init("place", thecollections, function(mongo, colls) {
                dataStore.init(colls.place, mongo, locker);
                dataStore.addEvent(twitterBBEvent, self.callback);
            });
        },
        "successfully" : function(err, response) {
            var box = twitterBBEvent.data.place.bounding_box.coordinates[0];
            var allLat = 0;
            var allLng = 0;

            for (var i=0; i<box.length; ++i) {
                allLat += box[i][1];
                allLng += box[i][0];
            }
            var lat = +(allLat / 4).toFixed(5);
            var lng = +(allLng / 4).toFixed(5);

            assert.isNull(err);
            assert.equal(response.lat, lat);
            assert.equal(response.lng, lng);
        }
    }
}).addBatch({
    "state" : {
        topic:function() {
            request.get({uri:lconfig.lockerBase + "/Me/places/state"}, this.callback);
        },
        "contains lastId":function(topic) {
            assert.include(topic.body, "lastId");
        }
    }
}).addBatch({
    "cleanup" : function() {
        process.chdir(cwd);
    }
});


suite.export(module);
