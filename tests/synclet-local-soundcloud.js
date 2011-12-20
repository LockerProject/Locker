var fakeweb = require('node-fakeweb');
var assert = require("assert");
var RESTeasy = require('api-easy');
var vows = require("vows");
var suite = RESTeasy.describe("SoundCloud Synclets");
var fs = require('fs');

var tracks = require('../Connectors/SoundCloud/tracks');
var followings = require('../Connectors/SoundCloud/followings');
var favorites = require('../Connectors/SoundCloud/favorites');

var curDir = process.cwd();

process.setMaxListeners(0);
process.on('uncaughtException',function(error){
    console.dir(error.stack);
});

var mePath = '/Data/soundcloud';
var pinfo = JSON.parse(fs.readFileSync(__dirname + mePath + '/me.json'));

suite.next().suite.addBatch({
    "Can get tracks" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({uri : 'https://api.soundcloud.com:443/me/tracks?oauth_token=foo',
                file : __dirname + '/fixtures/soundcloud/tracks.json' });
            process.chdir("." + mePath);
            tracks.sync(pinfo, this.callback)
        },
        "successfully" : function(err, response) {
            assert.isNull(err);
            assert.equal(response.data.tracks.length, 6);
            assert.equal(response.data.tracks[0].id, 30889718);
            assert.equal(response.data.tracks[5].id, 23225491);
        }
    }
}).addBatch({
    "Can get followings" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({uri : 'https://api.soundcloud.com:443/me/followings?oauth_token=foo',
                file : __dirname + '/fixtures/soundcloud/followings.json' });
            followings.sync(pinfo, this.callback)
        },
        "successfully" : function(err, response) {
            assert.isNull(err);
            assert.equal(response.data.followings.length, 2);
            assert.equal(response.data.followings[0].id, 2879548);
            assert.equal(response.data.followings[1].id, 169570);
        }
    }
}).addBatch({
    "Can get favorites" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({uri : 'https://api.soundcloud.com:443/me/favorites?oauth_token=foo',
                file : __dirname + '/fixtures/soundcloud/favorites.json' });
            favorites.sync(pinfo, this.callback)
        },
        "successfully" : function(err, response) {
            assert.isNull(err);
            assert.equal(response.data.favorites.length, 1);
            assert.equal(response.data.favorites[0].id, 730252);
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
