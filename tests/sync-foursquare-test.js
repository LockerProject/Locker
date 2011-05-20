var fakeweb = require(__dirname + '/fakeweb.js');
var foursquare = require('../Connectors/foursquare/sync');
foursquare.init({accessToken : 'abc'});
var assert = require("assert");
var vows = require("vows");
var fs = require("fs");

// figure out if this supports batch setup / teardown, which makes far more sense for this than doing it in each.
// without that, we have to split these into separate batches to ensure a consistent fakeweb state before and after
vows.describe("Foursquare sync").addBatch({
    "Can get checkins" : {
        topic: function() {
            process.chdir('./Me/Foursquare');
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({
                uri : 'https://api.foursquare.com/v2/users/self/checkins.json?limit=250&offset=0&oauth_token=abc&afterTimestamp=1305252459',
                body : '{"meta":{"code":200},"response":{"checkins":{"count":1450,"items":[]}}}' });
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
            assert.equal(response, 251); },
        "successfully " : {
            topic: function() {
                foursquare.syncCheckins(this.callback) },
            "again" : function(err, response) {
                assert.equal(response, 0);
                fs.unlinkSync("places.json");
                fs.unlinkSync("profile.json");
                fs.unlinkSync("updateState.json");
            }
        }
    }
}).addBatch({
    "Can get friends" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({
                uri : 'https://api.foursquare.com/v2/users/self.json?oauth_token=abc',
                file : __dirname + '/fixtures/foursquare/me.json' });
            fakeweb.registerUri({
                uri : 'https://api.foursquare.com/v2/users/self/friends.json?oauth_token=abc',
                file : __dirname + '/fixtures/foursquare/friends.json' });
            fakeweb.registerUri({
                uri : 'https://api.foursquare.com/v2/users/2715557.json?oauth_token=abc',
                file : __dirname + '/fixtures/foursquare/2715557.json' });
            foursquare.syncFriends(this.callback) },
        "successfully" : function(err, response) {
            assert.equal(response, 1);
        }
    }
}).addBatch({
    "Tears itself down successfully" : {
        topic: function() {
            fakeweb.tearDown();
            process.chdir('../..');
        }
    }
}).export(module);