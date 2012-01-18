var fakeweb = require('node-fakeweb');
var checkins = require('../Connectors/foursquare/checkins');
var friends = require('../Connectors/foursquare/friends');
var recents = require('../Connectors/foursquare/recent');
var assert = require("assert");
var RESTeasy = require('api-easy');
var vows = require("vows");
var suite = RESTeasy.describe("Foursquare Synclet");
var fs = require('fs');
var curDir = process.cwd();

process.setMaxListeners(0);
process.on('uncaughtException',function(error){
    console.dir(error.stack);
});

var mePath = '/Data/foursquare';
var pinfo = JSON.parse(fs.readFileSync(__dirname + mePath + '/me.json'));

suite.next().suite.addBatch({
    "Can get checkins" : {
        topic: function() {
            process.chdir('.' + mePath);
            fs.mkdirSync('./photos', 0755);
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({
                uri : 'https://api.foursquare.com/v2/users/self/checkins.json?limit=250&offset=0&oauth_token=abc&afterTimestamp=1305252460',
                body : '{"meta":{"code":200},"response":{"checkins":{"count":1450,"items":[]}}}' });
            fakeweb.registerUri({
                uri : 'https://api.foursquare.com:443/v2/users/self/checkins.json?limit=250&offset=0&oauth_token=abc&afterTimestamp=1305252460',
                body : '{"meta":{"code":200},"response":{"checkins":{"count":1450,"items":[]}}}' });
            fakeweb.registerUri({
                uri : 'https://api.foursquare.com/v2/users/self.json?oauth_token=abc',
                file : __dirname + '/fixtures/foursquare/me.json' });
            fakeweb.registerUri({
                uri : 'https://api.foursquare.com:443/v2/users/self.json?oauth_token=abc',
                file : __dirname + '/fixtures/foursquare/me.json' });
            fakeweb.registerUri({
                uri : 'https://api.foursquare.com/v2/users/self/checkins.json?limit=250&offset=0&oauth_token=abc&afterTimestamp=1',
                file : __dirname + '/fixtures/foursquare/checkins_1.json' });
            fakeweb.registerUri({
                uri : 'https://api.foursquare.com:443/v2/users/self/checkins.json?limit=250&offset=0&oauth_token=abc&afterTimestamp=1',
                file : __dirname + '/fixtures/foursquare/checkins_1.json' });
            fakeweb.registerUri({
                uri : 'https://api.foursquare.com/v2/users/self/checkins.json?limit=250&offset=250&oauth_token=abc&afterTimestamp=1',
                file : __dirname + '/fixtures/foursquare/checkins_2.json' });
            fakeweb.registerUri({
                uri : 'https://api.foursquare.com:443/v2/users/self/checkins.json?limit=250&offset=250&oauth_token=abc&afterTimestamp=1',
                file : __dirname + '/fixtures/foursquare/checkins_2.json' });
            fakeweb.registerUri({
                uri : 'https://playfoursquare.s3.amazonaws.com/pix/EU5F5YNRMM04QJR0YDMWEHPJ1DYUSTYXOET2BK0YJNFSHSKE.jpg',
                file : __dirname + '/fixtures/foursquare/EU5F5YNRMM04QJR0YDMWEHPJ1DYUSTYXOET2BK0YJNFSHSKE.jpg' });
            fakeweb.registerUri({
                uri : 'https://playfoursquare.s3.amazonaws.com:443/pix/EU5F5YNRMM04QJR0YDMWEHPJ1DYUSTYXOET2BK0YJNFSHSKE.jpg',
                file : __dirname + '/fixtures/foursquare/EU5F5YNRMM04QJR0YDMWEHPJ1DYUSTYXOET2BK0YJNFSHSKE.jpg' });
            checkins.sync(pinfo, this.callback);
        },
        "successfully" : function(err, response) {
            assert.isNull(err);
            assert.equal(response.config.updateState.checkins.syncedThrough, '1305252459');
            assert.equal(response.data.checkin[0].type, 'new');
            assert.equal(response.data.checkin[0].obj.id, '4d1dcbf7d7b0b1f7f37bfd9e');
            assert.equal(response.data.checkin[1].obj.photoID, undefined);
            pinfo.config = response.config;
        }
    }
}).addBatch({
    "Successfully updates state going forward" : {
        topic: function() {
            checkins.sync(pinfo, this.callback);
        },
        "and doesn't try to pull down the same checkins again" : function(err, response) {
            assert.equal(response.config.updateState.checkins.syncedThrough, '1305252459');
        }
    }
}).addBatch({
    "Can get friends" : {
        topic: function() {
            fakeweb.registerUri({
                uri : 'https://api.foursquare.com/v2/users/self.json?oauth_token=abc',
                file : __dirname + '/fixtures/foursquare/me.json' });
            fakeweb.registerUri({
                uri : 'https://api.foursquare.com/v2/users/self/friends.json?oauth_token=abc&limit=500',
                file : __dirname + '/fixtures/foursquare/friends.json' });
            fakeweb.registerUri({
                uri : 'https://api.foursquare.com/v2/multi?requests=/users/2715557,/users/18387,&oauth_token=abc',
                file : __dirname + '/fixtures/foursquare/users.json' });
            fakeweb.registerUri({
                uri : 'https://playfoursquare.s3.amazonaws.com/userpix_thumbs/UFTTLGSOZMNGZZ3T.png',
                file : __dirname + '/fixtures/foursquare/ctide.png' });
            friends.sync(pinfo, this.callback) },
        "successfully" : function(err, response) {
            assert.isNull(err);
            assert.equal(response.data.contact[0].type, 'new');
            assert.equal(response.data.contact[0].obj.id, '18387');
            assert.equal(response.data.contact[1].obj.photoID, undefined);
            assert.deepEqual(response.config.ids.contact, ['2715557','18387']);
            assert.equal(response.data.photo[0].obj.photoID, '18514');
        }
    }
}).addBatch({
    "Can get recents" : {
        topic: function() {
            fakeweb.registerUri({
                uri : 'https://api.foursquare.com/v2/checkins/recent.json?limit=100&oauth_token=abc',
                file : __dirname + '/fixtures/foursquare/recents.json' });
            recents.sync(pinfo, this.callback) },
        "successfully" : function(err, response) {
            assert.isNull(err);
            assert.equal(response.data.recents[0].obj.id, '4e41ca3a62e13c6ce802fea8');
            assert.equal(response.data.recents[1].obj.venue.id, '44741dadf964a520ab331fe3');
            var fixture = JSON.parse(fs.readFileSync(__dirname + '/fixtures/foursquare/recents.json', 'ascii'));
            assert.deepEqual(response.config.recents, {"4e41ca3a62e13c6ce802fea8" : true, "4e41c4f5b0fb09b6086758c1" : true});
        }
    }
}).addBatch({
    "cleanup" : {
        topic: [],
        "after itself": function(topic) {
            process.chdir(curDir);
            assert.equal(process.cwd(), curDir);
        }
    }
})

suite.export(module);
