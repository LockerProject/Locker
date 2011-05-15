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
            fakeweb.registerUri({
                uri : 'https://api.foursquare.com/v2/users/self.json?oauth_token=abc',
                file : __dirname + '/fixtures/foursquare/me.json' });
            fakeweb.registerUri({
                uri : 'https://api.foursquare.com/v2/users/self/checkins.json?limit=250&offset=0&oauth_token=abc&afterTimestamp=1',
                file : __dirname + '/fixtures/foursquare/checkins_1.json' });
            fakeweb.registerUri({
                uri : 'https://api.foursquare.com/v2/users/self/checkins.json?limit=250&offset=250&oauth_token=abc&afterTimestamp=1',
                file : __dirname + '/fixtures/foursquare/checkins_2.json' });
            foursquare.syncCheckins(this.callback) },
        "successfully" : function(err, response) {
            fakeweb.cleanRegistry();
            fs.unlink("places.json");
            fs.unlink("profile.json");
            fs.unlink("updateState.json");
            assert.equal(response, 251); }
            // this is the correct way to perform these functions, but teardown isn't safe right now.  if this is the last test, vows will exit
            // before the teardown is done.  see: https://github.com/cloudhead/vows/pull/82
            // ,
            //         teardown: function(topic) {
            //             fakeweb.cleanRegistry();
            //             fs.unlink("places.json");
            //             fs.unlink("profile.json");
            //             fs.unlink("updateState.json");
            //             fakeweb.allowNetConnect = true; }
    }
}).export(module);