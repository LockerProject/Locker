var fakeweb = require(__dirname + '/fakeweb.js');
var sync = require('../synclets/foursquare/foursquare');
var assert = require("assert");
var RESTeasy = require('api-easy');
var vows = require("vows");
var suite = RESTeasy.describe("Foursquare Synclet");
var fs = require('fs');

process.on('uncaughtException',function(error){
    console.dir(error.stack);
});

var mePath = '/Data/synclets/foursquare';
var pinfo = JSON.parse(fs.readFileSync(__dirname + mePath + '/me.json'));

suite.next().suite.addBatch({
    "Can get checkins" : {
        topic: function() {
            process.chdir('.' + mePath);
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
            fakeweb.registerUri({
                uri : 'https://playfoursquare.s3.amazonaws.com/pix/EU5F5YNRMM04QJR0YDMWEHPJ1DYUSTYXOET2BK0YJNFSHSKE.jpg',
                file : __dirname + '/fixtures/foursquare/EU5F5YNRMM04QJR0YDMWEHPJ1DYUSTYXOET2BK0YJNFSHSKE.jpg' });
            sync.sync(pinfo, this.callback);
        },
        "successfully" : function(err, response) {
            assert.isNull(err);
            assert.equal(response.config.updateState.checkins.syncedThrough, '1305252459');
            assert.equal(response.data.place[0].type, 'new');
            assert.equal(response.data.place[0].obj.id, '4d1dcbf7d7b0b1f7f37bfd9e');
            assert.equal(response.data.place[1].obj.photoID, undefined);
            pinfo.config = response.config;
        }
    }
}).addBatch({
    "Successfully updates state going forward" : {
        topic: function() {
            sync.sync(pinfo, this.callback);
        },
        "and doesn't try to pull down the same checkins again" : function(err, response) {
            assert.equal(response.config.updateState.checkins.syncedThrough, '1305252459');
        }
    }
});

suite.export(module);
