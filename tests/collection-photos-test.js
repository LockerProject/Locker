var fakeweb = require('node-fakeweb');
var dataStore = require('../Collections/Photos/dataStore');
var sync = require('../Collections/Photos/sync');
var assert = require("assert");
var RESTeasy = require('api-easy');
var vows = require("vows");
var suite = RESTeasy.describe("Photos Collection");
var fs = require('fs');
var request = require('request');
var foursquareEvent = JSON.parse(fs.readFileSync('fixtures/events/photos/foursquare.json','utf8'));
var facebookEvent = JSON.parse(fs.readFileSync('fixtures/events/photos/facebook.json','utf8'));

process.setMaxListeners(0);
process.on('uncaughtException',function(error){
    console.dir(error.stack);
});

var mePath = '/Data/photos';
var pinfo = JSON.parse(fs.readFileSync(__dirname + mePath + '/me.json'));

var thecollections = ['photos'];
var lconfig = require('../Common/node/lconfig');
lconfig.load("Config/config.json");
var locker = require(__dirname + "/../Common/node/locker");
locker.event = function(){};

var cwd = process.cwd();
var lmongo = require('../Common/node/lmongo.js');

suite.next().suite.addBatch({
    "Can process Facebook event" : {
        topic: function() {
            process.chdir("." + mePath);
            var self = this;
            lmongo.init("photos", thecollections, function(mongo, colls) {
                dataStore.init(colls.photos, mongo, locker);
                dataStore.addEvent(facebookEvent, self.callback);
            });
        },
        "successfully" : function(err, response) {
            assert.isNull(err);
            assert.equal(response.data.sourceLink, 'http://www.facebook.com/photo.php?pid=1887967&id=709761820');
            assert.equal(response.data.timestamp, 1233685472000);
        }
    }
}).addBatch({
    "Can process Foursquare event" : {
        topic: function() {
            dataStore.addEvent(foursquareEvent, this.callback);
        },
        "successfully" : function(err, response) {
            assert.isNull(err);
            assert.equal(response.data.timestamp, 1303341763000);
            assert.equal(response.data.sourceLink, 'http://foursquare.com/user/7604010/checkin/4daf6ac35da3f2f3d2a5cd04');
        }
    }
}).addBatch({
    "state" : {
        topic:function() {
            request.get({uri:lconfig.lockerBase + "/Me/photos/state"}, this.callback);
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
