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

process.setMaxListeners(0);
process.on('uncaughtException',function(error){
    console.dir(error.stack);
});

var mePath = '/Data/places';
var pinfo = JSON.parse(fs.readFileSync(__dirname + mePath + '/me.json'));

var thecollections = ['places'];
var lconfig = require('../Common/node/lconfig');
lconfig.load("Config/config.json");
var locker = require(__dirname + "/../Common/node/locker");
locker.event = function(){};

var cwd = process.cwd();
var lmongo = require('../Common/node/lmongo.js');

suite.next().suite.addBatch({
    "Can process Twitter event" : {
        topic: function() {
            process.chdir("." + mePath);
            var self = this;
            lmongo.init("place", thecollections, function(mongo, colls) {
                dataStore.init(colls.places, mongo, locker);
                dataStore.addEvent(twitterEvent, self.callback);
            });
        },
        "successfully" : function(err, response) {
            assert.isNull(err);
            assert.equal(response.data.text, 'Wired: U.S. Drone Controllers Said To Be Infected By Computer Virus');
            assert.equal(response.data.id, 122435457991720960);
        }
    }
}).addBatch({
    "Can process Foursquare event" : {
        topic: function() {
            dataStore.addEvent(foursquareEvent, this.callback);
        },
        "successfully" : function(err, response) {
            assert.isNull(err);
            assert.equal(response.data.at, 1303341763000);
            assert.equal(response.data.title, 'Singly Is Awesome');
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
