var fakeweb = require(__dirname + '/fakeweb.js');
var twitter = require('../Connectors/Twitter/sync');
var assert = require("assert");
var vows = require("vows");
var fs = require("fs");
var currentDir = process.cwd();



vows.describe("Twitter sync").addBatch({
    "Can get timeline" : {
        topic: function() {
            console.log(process.cwd());
            process.chdir('./Me/Twitter');
            fakeweb.allowNetConnect = false;
            twitter.init({consumerKey : 'abc', consumerSecret : 'abc', token: {'oauth_token' : 'abc', 'oauth_token_secret' : 'abc'}}, this.callback); },
        "after setting up": {
            topic: function() {
                fakeweb.registerUri({
                    uri : "https://api.twitter.com:443/1/statuses/home_timeline.json?count=200&page=1&include_entities=true",
                    file : __dirname + '/fixtures/twitter/home_timeline.js' });
                fakeweb.registerUri({
                    uri : "https://api.twitter.com:443/1/statuses/home_timeline.json?count=200&page=2&include_entities=true&max_id=71348168469643260",
                    body : '[]' });
                twitter.pullStatuses("home_timeline", this.callback); },
            "successfully": function(err, response) {
                assert.equal(response, "synced home_timeline with 1 new entries");
            }
        }
    }
}).addBatch({
    "Tears itself down" : {
        topic: [],
        'sucessfully': function(topic) {
            fakeweb.tearDown();
            process.chdir('../..');
            assert.equal(process.cwd(), currentDir);
        }
    }
}).export(module);