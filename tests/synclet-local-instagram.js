var fakeweb = require('node-fakeweb');
var media = require('../Connectors/Instagram/media');
var follows = require('../Connectors/Instagram/follows');
var feed = require('../Connectors/Instagram/feed');
var profile = require('../Connectors/Instagram/self');
var assert = require("assert");
var RESTeasy = require('api-easy');
var vows = require("vows");
var suite = RESTeasy.describe("Instagram Synclet");
var fs = require('fs');
var curDir = process.cwd();

process.setMaxListeners(0);
process.on('uncaughtException',function(error){
    console.dir(error.stack);
});

var mePath = '/Data/instagram';
var pinfo = JSON.parse(fs.readFileSync(__dirname + mePath + '/me.json'));

suite.next().suite.addBatch({
    "Can get media" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({
                uri : 'https://api.instagram.com/v1//users/self/media/recent?min_id=&access_token=DUMMY',
                contentType:"application/json",
                body: JSON.parse(fs.readFileSync(__dirname + '/fixtures/instagram/media.json')) });
            media.sync(pinfo, this.callback) },
        "successfully" : function(err, response) {
            assert.equal(response.data.photo[0].obj.filter, 'Walden');
        }
    }
})
.addBatch({
    "Can get profile" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({
                uri : 'https://api.instagram.com/v1//users/self?access_token=DUMMY',
                contentType:"application/json",
                body: JSON.parse(fs.readFileSync(__dirname + '/fixtures/instagram/self.json')) });
            profile.sync(pinfo, this.callback) },
        "successfully" : function(err, response) {
            assert.equal(response.data.profile[0].obj.username, 'quartzjer');
        }
    }
})
.addBatch({
    "Can get follows" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({
                uri : 'https://api.instagram.com/v1//users/self/follows?access_token=DUMMY',
                contentType:"application/json",
                body: JSON.parse(fs.readFileSync(__dirname + '/fixtures/instagram/follows.json')) });
            follows.sync(pinfo, this.callback) },
        "successfully" : function(err, response) {
            assert.equal(response.data.contact[0].obj.username, 'elandrum');
        }
    }
})
.addBatch({
    "Can get feed" : {
        topic: function() {
            fakeweb.allowNetConnect = false;
            fakeweb.registerUri({
                uri : 'https://api.instagram.com/v1//users/self/feed?min_id=&access_token=DUMMY',
                contentType:"application/json",
                body: JSON.parse(fs.readFileSync(__dirname + '/fixtures/instagram/feed.json')) });
            feed.sync(pinfo, this.callback) },
        "successfully" : function(err, response) {
            assert.equal(response.data.feed[0].obj.caption.text, 'Morning Mission. ');
        }
    }
})

suite.export(module);
