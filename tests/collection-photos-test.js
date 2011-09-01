var fakeweb = require(__dirname + '/fakeweb.js');
var dataStore = require('../Collections/Photos/dataStore');
var sync = require('../Collections/Photos/sync');
var assert = require("assert");
var RESTeasy = require('api-easy');
var vows = require("vows");
var suite = RESTeasy.describe("Photos Collection");
var fs = require('fs');
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

var lmongoclient = require('../Common/node/lmongoclient.js')(lconfig.mongo.host, lconfig.mongo.port, "photos", thecollections);


suite.next().suite.addBatch({
    "Can process Facebook event" : {
        topic: function() {
            var self = this;
            lmongoclient.connect(function(mongo) {
                process.chdir("." + mePath);
                dataStore.init(mongo.collections.photos);
                dataStore.processEvent(facebookEvent, self.callback);
            });
        },
        "successfully" : function(err, response) {
            assert.isNull(err);
        }
    }
}).addBatch({
    "Can process Foursquare event" : {
        topic: function() {
            dataStore.processEvent(foursquareEvent, this.callback);
        },
        "successfully" : function(err, response) {
            assert.isNull(err);
        }
    }
});


suite.export(module);
