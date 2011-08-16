var fakeweb = require(__dirname + '/fakeweb.js');
require.paths.unshift('../Connectors/Twitter/');
var friends = require('friends');
var assert = require("assert");
var RESTeasy = require('api-easy');
var vows = require("vows");
var suite = RESTeasy.describe("Twitter Synclets");
var fs = require('fs');
var curDir = process.cwd();

process.on('uncaughtException',function(error){
    console.dir(error.stack);
});

var mePath = '/Data/twitter-1';
var pinfo = JSON.parse(fs.readFileSync(__dirname + mePath + '/me.json'));

suite.next().suite.addBatch({
    "Can get users" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({uri : 'https://api.twitter.com:443/1/account/verify_credentials.json?path=%2Faccount%2Fverify_credentials.json&include_entities=true',
                file : __dirname + '/fixtures/twitter/verify_credentials.js' });
            fakeweb.registerUri({uri : 'https://api.twitter.com:443/1/friends/ids.json?screen_name=ctide&cursor=-1&path=%2Ffriends%2Fids.json&include_entities=true',
                file : __dirname + '/fixtures/twitter/friends.js' });
            fakeweb.registerUri({uri : 'https://api.twitter.com:443/1/users/lookup.json?path=%2Fusers%2Flookup.json&user_id=1054551&include_entities=true',
                file : __dirname + '/fixtures/twitter/1054551.js' });
            fakeweb.registerUri({uri : 'http://a0.twimg.com/profile_images/299352843/Picture_82_normal.png',
                file : __dirname + '/fixtures/twitter/1054551.png',
                contentType : 'image/png' });
            process.chdir('.' + mePath);
            friends.sync(pinfo, this.callback)
        },
        "successfully" : function(err, response) {
            // console.error('DEBUG: err', err);
            // console.error('DEBUG: response', response.data);
            assert.equal(response.data.contact[0].obj.id, '1054551');
            process.chdir(curDir);
        }
    }
})

suite.export(module);