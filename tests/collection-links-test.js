var fakeweb = require(__dirname + '/fakeweb.js');
var dataStore = require('../Collections/Links/dataStore');
var dataIn = require('../Collections/Links/dataIn');
var util = require('../Collections/Links/util');
var search = require('../Collections/Links/search');
var assert = require("assert");
var RESTeasy = require('api-easy');
var vows = require("vows");
var suite = RESTeasy.describe("Links Collection");
var fs = require('fs');
var twitterEvent = JSON.parse(fs.readFileSync('fixtures/events/links/twitter_event_2.json','ascii'));
var facebookEvent = JSON.parse(fs.readFileSync('fixtures/events/links/facebook_event_1.json','ascii'));

process.setMaxListeners(0);
process.on('uncaughtException',function(error){
    console.dir(error.stack);
});

var mePath = '/Data/links';
var pinfo = JSON.parse(fs.readFileSync(__dirname + mePath + '/me.json'));

var thecollections = ['link','encounter','queue'];
var lconfig = require('../Common/node/lconfig');
lconfig.load("Config/config.json");
var locker = {};
locker.event = function(){};
util.expandUrl = function(a,b,c){b(a.url);c();} // fakeweb doesn't support HEAD reqs AFAICT :(

var lmongo = require('../Common/node/lmongo.js');

suite.next().suite.addBatch({
    "Can process Tweet" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            var self = this;
            fakeweb.registerUri({uri : 'http://bit.ly/jBrrAe', body:'', contentType:"text/html" });
            fakeweb.registerUri({uri : 'http://bit.ly/jO9Pfy', body:'', contentType:"text/html" });

            lmongo.init("links", thecollections, function(mongo, colls) {
                process.chdir("." + mePath);
                dataStore.init(colls.link, colls.encounter, colls.queue);
                search.init(dataStore);
                dataIn.init(locker, dataStore, search);
                dataIn.processEvent(twitterEvent, function(){dataStore.getTotalLinks(self.callback)});
            });
        },
        "successfully" : function(err, response) {
            assert.equal(response, 2);
        }
    }
}).addBatch({
    "Can process Facebook Post" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            var self = this;
            fakeweb.registerUri({uri : 'http://singly.com/', body:'', contentType:"text/html" });
            dataIn.processEvent(facebookEvent, function(){dataStore.getTotalLinks(self.callback)});
        },
        "successfully" : function(err, response) {
            assert.equal(response, 3);
        }
    }
}).addBatch({
    "Can Search" : {
        topic: function() {
            search.search("gnome",this.callback);
        },
        "successfully" : function(err, response) {
            assert.equal(response.length, 2);
        }
    }
});


suite.export(module);
