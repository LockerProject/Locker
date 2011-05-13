var fakeweb = require(__dirname + '/fakeweb.js');
var foursquare = require('../Connectors/foursquare/sync');
foursquare.init({accessToken : 'abc'});
var assert = require("assert");
var vows = require("vows");
var locker = require('../Common/node/locker.js');
var fs = require("fs");


vows.describe("Foursquare sync").addBatch({
    "Can get checkins" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri('https://api.foursquare.com/v2/users/self.json?oauth_token=abc',
                __dirname + '/fixtures/foursquare/me.json');
            fakeweb.registerUri('https://api.foursquare.com/v2/users/self/checkins.json?limit=250&offset=0&oauth_token=abc&afterTimestamp=1',
                __dirname + '/fixtures/foursquare/checkins_1.json');
            fakeweb.registerUri('https://api.foursquare.com/v2/users/self/checkins.json?limit=250&offset=250&oauth_token=abc&afterTimestamp=1',
                __dirname + '/fixtures/foursquare/checkins_2.json');
            locker.at = function(uri, delayInSec) {}
            locker.diary = function(text) { console.log(text); }
            foursquare.syncCheckins(this.callback) },
        "successfully" : function(err, stat) {
            fakeweb.cleanRegistry();
            assert.isNull (err);
            fs.unlink("places.json");
            fs.unlink("profile.json");
            fs.unlink("updateState.json");
            fakeweb.allowNetConnect = true;
        }
    }
}).export(module);