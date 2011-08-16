var fakeweb = require(__dirname + '/fakeweb.js');
require.paths.unshift('../Connectors/Facebook/');
var friends = require('friends');
var assert = require("assert");
var RESTeasy = require('api-easy');
var vows = require("vows");
var suite = RESTeasy.describe("Facebook Synclets");
var fs = require('fs');
var curDir = process.cwd();

process.on('uncaughtException',function(error){
    console.dir(error.stack);
});

var mePath = '/Data/facebook';
var pinfo = JSON.parse(fs.readFileSync(__dirname + mePath + '/me.json'));

suite.next().suite.addBatch({
    "Can get users" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({uri : 'https://graph.facebook.com/me/friends?access_token=foo&date_format=U',
                file : __dirname + '/fixtures/facebook/friends2.json' });
            fakeweb.registerUri({uri : 'https://graph.facebook.com/1234?access_token=foo&date_format=U&fields=id,name,first_name,middle_name,last_name,gender,locale,languages,link,username,third_party_id,timezone,updated_time,verified,bio,birthday,education,email,hometown,interested_in,location,political,favorite_athletes,favorite_teams,quotes,relationship_status,religion,significant_other,video_upload_limits,website,work',
                file : __dirname + '/fixtures/facebook/1234.json' });
                fakeweb.registerUri({uri : 'https://graph.facebook.com/1234/picture?access_token=foo',
                    file : __dirname + '/fixtures/facebook/1234.jpg',
                    contentType : 'image/jpeg' });
            process.chdir("/tmp");
            friends.sync(pinfo, this.callback)
        },
        "successfully" : function(err, response) {
            // console.error('DEBUG: err', err);
            // console.error('DEBUG: response', response.data);
            assert.equal(response.data.contact[0].obj.id, '1234');
        }
    }
})

suite.export(module);