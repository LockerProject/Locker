var fakeweb = require('node-fakeweb');
var friends = require('../Connectors/Facebook/friends');
var home = require('../Connectors/Facebook/home');
var photos = require('../Connectors/Facebook/photos');
var assert = require("assert");
var RESTeasy = require('api-easy');
var vows = require("vows");
var suite = RESTeasy.describe("Facebook Synclets");
var fs = require('fs');
var curDir = process.cwd();

process.setMaxListeners(0);
process.on('uncaughtException',function(error){
    console.dir(error.stack);
});

var mePath = '/Data/facebook-1';
var pinfo = JSON.parse(fs.readFileSync(__dirname + mePath + '/me.json'));

suite.next().suite.addBatch({
    "Can get users" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({uri : 'https://graph.facebook.com:443/me/friends?access_token=foo&date_format=U',
                file : __dirname + '/fixtures/facebook/friends2.json' });
            fakeweb.registerUri({uri : 'https://graph.facebook.com:443/1234?access_token=foo&date_format=U&fields=id,name,first_name,middle_name,last_name,gender,locale,languages,link,username,third_party_id,timezone,updated_time,verified,bio,birthday,education,email,hometown,interested_in,location,political,favorite_athletes,favorite_teams,quotes,relationship_status,religion,significant_other,video_upload_limits,website,work',
                file : __dirname + '/fixtures/facebook/1234.json' });
            fakeweb.registerUri({uri : 'https://graph.facebook.com:443/1234/picture?access_token=foo',
                file : __dirname + '/fixtures/facebook/1234.jpg',
                contentType : 'image/jpeg' });
            process.chdir("." + mePath);
            friends.sync(pinfo, this.callback)
        },
        "successfully" : function(err, response) {
            assert.equal(response.data.contact[0].obj.id, '1234');
        }
    }
}).addBatch({
    "Can get newsfeed" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({uri : 'https://graph.facebook.com:443/me/home?access_token=foo&date_format=U&limit=100',
                file : __dirname + '/fixtures/facebook/home.json' });
            fakeweb.registerUri({uri : 'https://graph.facebook.com:443/me/feed?date_format=U&access_token=abc&limit=25&until=1305843879',
                body :'{"data":[]}' });

            home.sync(pinfo, this.callback)
        },
        "successfully" : function(err, response) {
            assert.equal(response.data.home[0].obj.id, '100002438955325_224550747571079');
        }
    }
}).addBatch({
    "Can get photos" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({uri : 'https://graph.facebook.com:443/me?access_token=foo&fields=id,name,first_name,middle_name,last_name,gender,locale,languages,link,username,third_party_id,timezone,updated_time,verified,bio,birthday,education,email,hometown,interested_in,location,political,favorite_athletes,favorite_teams,quotes,relationship_status,religion,significant_other,video_upload_limits,website,work',
                file : __dirname + '/fixtures/facebook/1234.json' });
            fakeweb.registerUri({uri : 'https://graph.facebook.com:443/me/albums?access_token=foo&date_format=U',file : __dirname + '/fixtures/facebook/albums.js' });
            fakeweb.registerUri({uri : 'https://graph.facebook.com:443/427822997594/photos?access_token=foo&date_format=U',file : __dirname + '/fixtures/facebook/photos.js' });
            fakeweb.registerUri({uri : 'https://graph.facebook.com:443/me/photos?access_token=foo&date_format=U',file : __dirname + '/fixtures/facebook/photos.js' });
            photos.sync(pinfo, this.callback)
        },
        "successfully" : function(err, response) {
            assert.equal(response.data.photo[0].obj.id, '214713967594');
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
