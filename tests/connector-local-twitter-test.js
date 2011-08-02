var fakeweb = require(__dirname + '/fakeweb.js');
var twitter = require('../Connectors/Twitter/sync');
var dataStore = require('../Common/node/connector/dataStore');
var RESTeasy = require('api-easy');
var assert = require("assert");
var vows = require("vows");
var fs = require("fs");
var currentDir = process.cwd();
var request = require('request');
var locker = require('../Common/node/locker');

var suite = RESTeasy.describe("Twitter Connector")
var utils = require('./test-utils');
process.on('uncaughtException',function(error){
    sys.puts(error.stack);
});

var svcId = "twitter";
var mePath = '/Data/' + svcId;

var thecollections = ['friends', 'followers', 'home_timeline', 'user_timeline', 'mentions'];
var lconfig = require('../Common/node/lconfig');
lconfig.load("config.json");

var lmongoclient = require('../Common/node/lmongoclient.js')(lconfig.mongo.host, lconfig.mongo.port, svcId, thecollections);
var mongoCollections;

var emittedEvents = [];
var levents = require('../Common/node/levents.js');
twitter.eventEmitter.on('contact/twitter', function(eventObj) {
    levents.fireEvent('contact/twitter', 'twitter-test', "new", eventObj);
});

twitter.eventEmitter.on('status/twitter', function(eventObj) {
    levents.fireEvent('status/twitter', 'twitter-test', "new", eventObj);
});

twitter.eventEmitter.on('link/twitter', function(eventObj) {
    levents.fireEvent('link/twitter', 'twitter-test', "new", eventObj);
});

var twitterEvent1 = JSON.parse(fs.readFileSync('fixtures/events/links/twitter_event_1.json','ascii'));

suite.next().suite.addBatch({
    "Can get" : {
        topic: function() {
            utils.hijackEvents(['link/twitter','contact/twitter','status/twitter'], 'twitter-test');
            utils.eventEmitter.on('event', function(body) { 
                var obj = JSON.parse(body);
                // We need to hide the timestamp, it's too hard to test
                delete obj.timestamp;
                emittedEvents.push(obj);
            });
            locker.initClient({lockerUrl:lconfig.lockerBase, workingDirectory:"." + mePath});
            process.chdir('.' + mePath);
            fakeweb.allowNetConnect = false;
            
            fakeweb.registerUri({
                uri : "https://api.twitter.com:443/1/statuses/home_timeline.json?count=200&page=1&include_entities=true",
                file : __dirname + '/fixtures/twitter/home_timeline.js' });
            fakeweb.registerUri({
                uri : "https://api.twitter.com:443/1/statuses/home_timeline.json?count=200&page=2&include_entities=true&max_id=71348168469643260",
                body : '[]' });
                
            fakeweb.registerUri({
                uri : 'https://api.twitter.com:443/1/statuses/mentions.json?count=200&page=1&include_entities=true',
                file : __dirname + '/fixtures/twitter/mentions.js' });
            fakeweb.registerUri({
                uri : 'https://api.twitter.com:443/1/statuses/mentions.json?count=200&page=2&include_entities=true&max_id=73034804081344510',
                body : '[]' });
            
            fakeweb.registerUri({
                uri : 'https://api.twitter.com:443/1/statuses/user_timeline.json?count=200&page=1&include_entities=true',
                file : __dirname + '/fixtures/twitter/user_timeline.js' });
            fakeweb.registerUri({
                uri : 'https://api.twitter.com:443/1/statuses/user_timeline.json?count=200&page=2&include_entities=true&max_id=73036575310757890',
                body : '[]' });
            
            fakeweb.registerUri({
                uri : 'https://api.twitter.com:443/1/account/verify_credentials.json?include_entities=true',
                file : __dirname + '/fixtures/twitter/verify_credentials.js' });
            fakeweb.registerUri({
                uri : 'https://api.twitter.com:443/1/friends/ids.json?screen_name=ctide&cursor=-1',
                body : '{"next_cursor_str":"0","next_cursor":0,"previous_cursor_str":"0","previous_cursor":0,"ids":[1054551]}' });
            fakeweb.registerUri({
                uri : 'https://api.twitter.com:443/1/users/lookup.json?user_id=1054551%2C&include_entities=true',
                file : __dirname + '/fixtures/twitter/1054551.js' });
                
            fakeweb.registerUri({
                uri : 'https://api.twitter.com:443/1/followers/ids.json?screen_name=ctide&cursor=-1',
                body : '{"next_cursor_str":"0","next_cursor":0,"previous_cursor_str":"0","previous_cursor":0,"ids":[1054551]}' });

            fakeweb.registerUri({
                uri : 'http://a0.twimg.com:80/profile_images/299352843/Picture_82_normal.png',
                file : __dirname + '/fixtures/twitter/verify_credentials.js' });
            var self = this;
            lmongoclient.connect(function(collections) {
                mongoCollections = collections;
                twitter.init({consumerKey : 'abc', consumerSecret : 'abc', 
                              token: {'oauth_token' : 'abc', 'oauth_token_secret' : 'abc'}}, collections);
                dataStore.init("id_str", mongoCollections);
                self.callback(); 
            });
        },
                            
        "home timeline": {
            topic: function() {
                twitter.pullStatuses("home_timeline", this.callback); },
            "successfully": function(err, repeatAfter, response) {
                assert.equal(repeatAfter, 60);
                assert.isNull(err);
                assert.equal(response, "synced home_timeline with 1 new entries"); },
            "emits proper status and link events": function() {
                assert.deepEqual(emittedEvents[0], twitterEvent1);
                assert.deepEqual(emittedEvents[1], {"obj": {"source":"home_timeline","type":"new","data":{ "url":{"expanded_url":null,"indices":[46,66],"url":"http://bit.ly/jBrrAe"}, "sourceObject":{ "favorited":false,"in_reply_to_user_id":null,"contributors":null,"truncated":false, "text":"GNOME Discusses Becoming a Linux-only Project http://bit.ly/jBrrAe (http://bit.ly/jO9Pfy) #guru", "created_at":"Thu May 19 22:55:03 +0000 2011","retweeted":false,"in_reply_to_status_id":null, "coordinates":null,"id":71348168469643260, "source":"<a href=\"http://news.ycombinator.com\" rel=\"nofollow\">newsyc</a>", "in_reply_to_status_id_str":null,"in_reply_to_screen_name":null, "user":{ "follow_request_sent":false,"profile_use_background_image":true,"id":148969874, "verified":false,"profile_sidebar_fill_color":"DDEEF6","profile_text_color":"333333", "followers_count":1801,"profile_sidebar_border_color":"C0DEED","id_str":"148969874", "default_profile_image":false,"location":"Silicon Valley, Calif.","utc_offset":-28800, "statuses_count":18728, "description":"Tweeting Hacker News stories as soon as they reach 20 points. Maintained by @jeffmiller. There's also @newsyc50, @newsyc100, @newsyc150.", "friends_count":0,"profile_link_color":"0084B4", "profile_image_url":"http://a1.twimg.com/profile_images/1081970640/yclogo_normal.gif", "notifications":false,"show_all_inline_media":false,"geo_enabled":false, "profile_background_color":"C0DEED", "profile_background_image_url":"http://a2.twimg.com/profile_background_images/224692672/IMG_2595.JPG", "name":"Hacker News 20","lang":"en","following":true,"profile_background_tile":false, "favourites_count":0,"screen_name":"newsyc20","url":"http://bit.ly/newsyctwitter", "created_at":"Fri May 28 02:33:26 +0000 2010","contributors_enabled":false, "time_zone":"Pacific Time (US & Canada)","protected":false,"default_profile":false,"is_translator":false ,"listed_count":172 }, "entities":{ "urls":[ {"expanded_url":null,"indices":[46,66],"url":"http://bit.ly/jBrrAe"}, {"expanded_url":null,"indices":[68,88],"url":"http://bit.ly/jO9Pfy"} ] }, "place":null,"retweet_count":0,"geo":null,"in_reply_to_user_id_str":null, "id_str":"71348168469643264" } } },"via":"twitter-test", "action":"new", "type":"link/twitter"});
                assert.deepEqual(emittedEvents[2], {"obj":{"source":"home_timeline","type":"new","data":{"url":{"expanded_url":null,"indices":[68,88],"url":"http://bit.ly/jO9Pfy"},"sourceObject":{"favorited":false,"in_reply_to_user_id":null,"contributors":null,"truncated":false,"text":"GNOME Discusses Becoming a Linux-only Project http://bit.ly/jBrrAe (http://bit.ly/jO9Pfy) #guru","created_at":"Thu May 19 22:55:03 +0000 2011","retweeted":false,"in_reply_to_status_id":null,"coordinates":null,"id":71348168469643260,"source":"<a href=\"http://news.ycombinator.com\" rel=\"nofollow\">newsyc</a>","in_reply_to_status_id_str":null,"in_reply_to_screen_name":null,"user":{"follow_request_sent":false,"profile_use_background_image":true,"id":148969874,"verified":false,"profile_sidebar_fill_color":"DDEEF6","profile_text_color":"333333","followers_count":1801,"profile_sidebar_border_color":"C0DEED","id_str":"148969874","default_profile_image":false,"location":"Silicon Valley, Calif.","utc_offset":-28800,"statuses_count":18728,"description":"Tweeting Hacker News stories as soon as they reach 20 points. Maintained by @jeffmiller. There's also @newsyc50, @newsyc100, @newsyc150.","friends_count":0,"profile_link_color":"0084B4","profile_image_url":"http://a1.twimg.com/profile_images/1081970640/yclogo_normal.gif","notifications":false,"show_all_inline_media":false,"geo_enabled":false,"profile_background_color":"C0DEED","profile_background_image_url":"http://a2.twimg.com/profile_background_images/224692672/IMG_2595.JPG","name":"Hacker News 20","lang":"en","following":true,"profile_background_tile":false,"favourites_count":0,"screen_name":"newsyc20","url":"http://bit.ly/newsyctwitter","created_at":"Fri May 28 02:33:26 +0000 2010","contributors_enabled":false,"time_zone":"Pacific Time (US & Canada)","protected":false,"default_profile":false,"is_translator":false,"listed_count":172},"entities":{"urls":[{"expanded_url":null,"indices":[46,66],"url":"http://bit.ly/jBrrAe"},{"expanded_url":null,"indices":[68,88],"url":"http://bit.ly/jO9Pfy"}]},"place":null,"retweet_count":0,"geo":null,"in_reply_to_user_id_str":null,"id_str":"71348168469643264"}}},"via":"twitter-test", "action":"new", "type":"link/twitter"});
                assert.equal(emittedEvents[3], undefined);
                emittedEvents = [];
            }
        }
    }
}).addBatch({
    "Can get" : {
        "mentions" : {
            topic: function() {
                twitter.pullStatuses("mentions", this.callback); },
            "sucessfully": function(err, repeatAfter, response) {
                assert.equal(repeatAfter, 120);
                assert.isNull(err);
                assert.equal(response, "synced mentions with 1 new entries"); },
            "emit a status event": function(err) {
                assert.deepEqual(emittedEvents[0], {"obj":{"source":"mentions","type":"new","status":{"favorited":false,"in_reply_to_user_id":14353581,"contributors":null,"truncated":false,"text":"@ww @ctide were you at shotwells? http://twitter.com/#!/quizmeixel/status/72908387251269632","created_at":"Tue May 24 14:37:08 +0000 2011","retweeted":false,"in_reply_to_status_id_str":"72905320569114624","coordinates":null,"id":73034804081344510,"source":"web","in_reply_to_status_id":72905320569114620,"in_reply_to_screen_name":"ww","user":{"follow_request_sent":false,"profile_use_background_image":true,"default_profile_image":false,"id":16120305,"verified":false,"profile_sidebar_fill_color":"F5E0CB","profile_text_color":"7DB092","followers_count":74,"protected":false,"id_str":"16120305","profile_background_color":"F7BE87","location":"san francisco","utc_offset":-28800,"statuses_count":1081,"description":"","friends_count":64,"profile_link_color":"3D131B","profile_image_url":"http://a1.twimg.com/profile_images/59428944/Photo_75_normal.jpg","following":true,"show_all_inline_media":false,"geo_enabled":true,"profile_background_image_url":"http://a0.twimg.com/profile_background_images/155174710/x7c2721ca06ad6477a8f78faf4f50c8c.png","screen_name":"larkinrichards","lang":"en","profile_background_tile":true,"favourites_count":3,"name":"larkinrichards","notifications":false,"url":null,"created_at":"Wed Sep 03 21:52:02 +0000 2008","contributors_enabled":false,"time_zone":"Pacific Time (US & Canada)","profile_sidebar_border_color":"D51717","default_profile":false,"is_translator":false,"listed_count":10},"place":null,"retweet_count":0,"geo":null,"in_reply_to_user_id_str":"14353581","id_str":"73034804081344512"}},"via":"twitter-test", "type":"status/twitter", "action":"new"});
                assert.equal(emittedEvents[1], undefined);
                emittedEvents = [];
            }
        }
    }
}).addBatch({
    "Can get" : {
        "user timeline" : {
            topic: function() {
                twitter.pullStatuses("user_timeline", this.callback); },
            "successfully": function(err, repeatAfter, response) {
                assert.isNull(err);
                assert.equal(repeatAfter, 120);
                assert.equal(response, "synced user_timeline with 1 new entries"); },
            "emits a status event": function(err) {
                assert.deepEqual(emittedEvents[0], {"obj":{"source":"user_timeline","type":"new","status":{"favorited":false,"in_reply_to_user_id":16120305,"contributors":null,"truncated":false,"text":"@larkinrichards @ww haha, no, but I wish I was!","created_at":"Tue May 24 14:44:11 +0000 2011","retweeted":false,"in_reply_to_status_id_str":"73034804081344512","coordinates":null,"id":73036575310757890,"source":"<a href=\"http://twitter.com/#!/download/iphone\" rel=\"nofollow\">Twitter for iPhone</a>","in_reply_to_status_id":73034804081344510,"in_reply_to_screen_name":"larkinrichards","user":{"follow_request_sent":false,"profile_use_background_image":true,"default_profile_image":false,"id":18040294,"verified":false,"profile_sidebar_fill_color":"DDEEF6","profile_text_color":"333333","followers_count":159,"protected":false,"id_str":"18040294","profile_background_color":"C0DEED","location":"San Francisco","utc_offset":-28800,"statuses_count":642,"description":"Fuck, man.","friends_count":158,"profile_link_color":"0084B4","profile_image_url":"http://a3.twimg.com/profile_images/1258206774/IMAG00282_normal.jpg","following":true,"show_all_inline_media":false,"geo_enabled":false,"profile_background_image_url":"http://a3.twimg.com/images/themes/theme1/bg.png","screen_name":"ctide","lang":"en","profile_background_tile":false,"favourites_count":0,"name":"Chris Burkhart","notifications":false,"url":null,"created_at":"Thu Dec 11 04:07:08 +0000 2008","contributors_enabled":false,"time_zone":"Pacific Time (US & Canada)","profile_sidebar_border_color":"C0DEED","default_profile":true,"is_translator":false,"listed_count":14},"place":null,"retweet_count":0,"geo":null,"in_reply_to_user_id_str":"16120305","id_str":"73036575310757888"}},"via":"twitter-test","action":"new","type":"status/twitter"});
                assert.equal(emittedEvents[1], undefined);
                emittedEvents = [];
            }
        }
    }
}).addBatch({
    "Can get" : {
        "friends" : {
            topic: function() {
                twitter.syncUsersInfo("friends", this.callback); },
            "successfully": function(err, repeatAfter, response) {
                assert.isNull(err);
                assert.equal(response, "synced 1 new friends");
                assert.equal(repeatAfter, 600); },
            "emits a contact event": function(err) {
                assert.deepEqual(emittedEvents[0], {"obj":{"source":"friends","type":"new","data":{"follow_request_sent":false,"profile_use_background_image":true,"default_profile_image":false,"id":1054551,"verified":false,"profile_sidebar_fill_color":"80d6f5","profile_text_color":"3C3940","followers_count":3210,"protected":false,"id_str":"1054551","profile_background_color":"0099B9","location":"NYC + SF ","status":{"favorited":false,"contributors":null,"truncated":false,"text":"On my way to Denver for @gluecon! First time at each! @lockerproject and @Singlyinc represent! http://4sq.com/kJoqgI","created_at":"Tue May 24 19:21:52 +0000 2011","retweeted":false,"in_reply_to_status_id_str":null,"coordinates":null,"id":73106458564247550,"source":"<a href=\"http://foursquare.com\" rel=\"nofollow\">foursquare</a>","in_reply_to_status_id":null,"in_reply_to_screen_name":null,"id_str":"73106458564247552","place":null,"retweet_count":0,"geo":null,"in_reply_to_user_id_str":null,"in_reply_to_user_id":null},"utc_offset":-18000,"statuses_count":5541,"description":"Product Engagement + Marketing at @SinglyInc + @LockerProject | @IgniteNYC\'s Director | ITP alum | Former life: concert curator + filmmaker ","friends_count":2007,"profile_link_color":"d13434","profile_image_url":"http://a0.twimg.com/profile_images/299352843/Picture_82_normal.png","following":true,"show_all_inline_media":false,"geo_enabled":false,"profile_background_image_url":"http://a0.twimg.com/profile_background_images/181149399/Screen_shot_2010-12-13_at_10.21.23_AM.png","screen_name":"tikkers","lang":"en","profile_background_tile":true,"favourites_count":406,"name":"Tikva Morowati","notifications":false,"url":"http://www.about.me/tikva","created_at":"Mon Mar 12 23:59:46 +0000 2007","contributors_enabled":false,"time_zone":"Eastern Time (US & Canada)","profile_sidebar_border_color":"9ecade","default_profile":false,"is_translator":false,"listed_count":200}},"via":"twitter-test","action":"new","type":"contact/twitter"});
                assert.equal(emittedEvents[1], undefined);
                emittedEvents = [];
            }
        }
    }
}).addBatch({
    "Can get" : {
        "followers" :  {
            topic : function() {
                twitter.syncUsersInfo("followers", this.callback); },
            "successfully": function(err, repeatAfter, response) {
                assert.isNull(err);
                assert.equal(response, "synced 1 new followers");
                assert.equal(repeatAfter, 600); },
            "emits a contact event": function(err) {
                assert.deepEqual(emittedEvents[0], {"obj":{"source":"followers","type":"new","data":{"follow_request_sent":false,"profile_use_background_image":true,"default_profile_image":false,"id":1054551,"verified":false,"profile_sidebar_fill_color":"80d6f5","profile_text_color":"3C3940","followers_count":3210,"protected":false,"id_str":"1054551","profile_background_color":"0099B9","location":"NYC + SF ","status":{"favorited":false,"contributors":null,"truncated":false,"text":"On my way to Denver for @gluecon! First time at each! @lockerproject and @Singlyinc represent! http://4sq.com/kJoqgI","created_at":"Tue May 24 19:21:52 +0000 2011","retweeted":false,"in_reply_to_status_id_str":null,"coordinates":null,"id":73106458564247550,"source":"<a href=\"http://foursquare.com\" rel=\"nofollow\">foursquare</a>","in_reply_to_status_id":null,"in_reply_to_screen_name":null,"id_str":"73106458564247552","place":null,"retweet_count":0,"geo":null,"in_reply_to_user_id_str":null,"in_reply_to_user_id":null},"utc_offset":-18000,"statuses_count":5541,"description":"Product Engagement + Marketing at @SinglyInc + @LockerProject | @IgniteNYC\'s Director | ITP alum | Former life: concert curator + filmmaker ","friends_count":2007,"profile_link_color":"d13434","profile_image_url":"http://a0.twimg.com/profile_images/299352843/Picture_82_normal.png","following":true,"show_all_inline_media":false,"geo_enabled":false,"profile_background_image_url":"http://a0.twimg.com/profile_background_images/181149399/Screen_shot_2010-12-13_at_10.21.23_AM.png","screen_name":"tikkers","lang":"en","profile_background_tile":true,"favourites_count":406,"name":"Tikva Morowati","notifications":false,"url":"http://www.about.me/tikva","created_at":"Mon Mar 12 23:59:46 +0000 2007","contributors_enabled":false,"time_zone":"Eastern Time (US & Canada)","profile_sidebar_border_color":"9ecade","default_profile":false,"is_translator":false,"listed_count":200}},"via":"twitter-test","action":"new","type":"contact/twitter"});
                assert.equal(emittedEvents[1], undefined);
                emittedEvents = [];
            }
        }
    }
});

suite.next().suite.addBatch({
    "Datastore function" : {
        "getPeopleCurrent returns ": {
            "followers" : {
                topic: function() {
                    dataStore.getAllCurrent("followers", this.callback); },
                "successfully": function(err, response) {
                    assert.isNull(err);
                    assert.equal(response.length, 1);
                    assert.equal(response[0].id, '1054551');
                }
            },
            "friends" : {
                topic: function() {
                    dataStore.getAllCurrent("friends", this.callback); },
                "successfully": function(err, response) {
                    assert.isNull(err);
                    assert.equal(response.length, 1);
                    assert.equal(response[0].id, '1054551');
                }
            }
        },
        "getStatusesCurrent from ": {
            "home_timeline returns" : {
                topic: function() {
                    dataStore.getAllCurrent("home_timeline", this.callback); },
                "successfully": function(err, response) {
                    assert.isNull(err);
                    assert.equal(response.length, 1);
                    assert.equal(response[0].id, '71348168469643260');
                }
            },
            "user_timeline returns" : {
                topic: function() {
                    dataStore.getAllCurrent("user_timeline", this.callback); },
                "successfully": function(err, response) {
                    assert.isNull(err);
                    assert.equal(response.length, 1);
                    assert.equal(response[0].id, '73036575310757890');
                }
            },
            "mentions returns" : {
                topic: function() {
                    dataStore.getAllCurrent("mentions", this.callback); },
                "successfully": function(err, response) {
                    assert.isNull(err);
                    assert.equal(response.length, 1);
                    assert.equal(response[0].id, '73034804081344510');
                }
            }
        }
    }
});

suite.next().suite.addBatch({
    "Handles defriending" : {
        topic: function() {
            fakeweb.registerUri({
                uri : 'https://api.twitter.com:443/1/friends/ids.json?screen_name=ctide&cursor=-1',
                body : '{"next_cursor_str":"0","next_cursor":0,"previous_cursor_str":"0","previous_cursor":0,"ids":[]}' });
            twitter.syncUsersInfo("friends", this.callback); },
        "successfully": function(err, repeatAfter, response) {
            assert.isNull(err);
            assert.equal(repeatAfter, 600);
            assert.equal(response, "removed 1 friends"); },
        "and generates a delete contact event": function(err) {
            assert.deepEqual(emittedEvents[0], {"obj":{"source":"friends","type":"delete","data":{"id":"1054551","deleted":true}},"via":"twitter-test","action":"new","type":"contact/twitter"});
            assert.equal(emittedEvents[1], undefined);
            emittedEvents = [];
        },
        "and getPeopleCurrent returns" : {
            topic: function() {
                dataStore.getAllCurrent("friends", this.callback); },
            "nothing": function(err, response) {
                assert.isNull(err);
                assert.equal(response.length, 0);
            }
        }
    }
}).addBatch({
    "Tears itself down" : {
        topic: [],
        'after checking there are no unhandled events': function(topic) {
            assert.equal(emittedEvents[0], undefined);
        },
        'sucessfully': function(topic) {
            utils.tearDown();
            fakeweb.tearDown();
            process.chdir('../..');
            assert.equal(process.cwd(), currentDir);
        }
    }
})


suite.next().use(lconfig.lockerHost, lconfig.lockerPort)
    .discuss("Twitter connector")
        .discuss("all current friends")
            .path("/Me/" + svcId + "/getCurrent/friends")
            .get()
                .expect('returns nothing', function(err, res, body) {
                    assert.isNull(err);
                    var contacts = JSON.parse(body);
                    assert.isNotNull(contacts);
                    assert.equal(contacts.length, 0); 
                })
            .unpath()
        .undiscuss()
        .discuss("all current followers")
            .path("/Me/" + svcId + "/getCurrent/followers")
            .get()
                .expect('returns one follower', function(err, res, body) {
                    assert.isNull(err);
                    var contacts = JSON.parse(body);
                    assert.isNotNull(contacts);
                    assert.equal(contacts.length, 1);
                    assert.equal(contacts[0].id, 1054551);
                })
            .unpath()
        .undiscuss()
        .discuss("all home_timeline updates")
            .path("/Me/" + svcId + "/getCurrent/home_timeline")
            .get()
                .expect('returns status updates', function(err, res, body) {
                    assert.isNull(err);
                    var statuses = JSON.parse(body);
                    assert.isNotNull(statuses);
                    assert.equal(statuses.length, 1); 
                    assert.equal(statuses[0].id, 71348168469643260);
                })
            .unpath()
        .undiscuss()
        .discuss("all mentions updates")
            .path("/Me/" + svcId + "/getCurrent/mentions")
            .get()
                .expect('returns status updates', function(err, res, body) {
                    assert.isNull(err);
                    var statuses = JSON.parse(body);
                    assert.isNotNull(statuses);
                    assert.equal(statuses.length, 1); 
                    assert.equal(statuses[0].id, 73034804081344510);
                })
            .unpath()
        .undiscuss()
        .discuss("all user_timeline updates")
            .path("/Me/" + svcId + "/getCurrent/user_timeline")
            .get()
                .expect('returns status updates', function(err, res, body) {
                    assert.isNull(err);
                    var statuses = JSON.parse(body);
                    assert.isNotNull(statuses);
                    assert.equal(statuses.length, 1); 
                    assert.equal(statuses[0].id, 73036575310757890);
                })
            .unpath()
        .undiscuss()
        .discuss("get photos")
            .path("/Me/" + svcId + "/getPhoto/1054551")
            .get()
                .expect('returns the photo fixture', function(err, res, body) {
                    assert.isNull(err);
                    assert.equal(res.statusCode, 200);
                    var photo = fs.readFileSync('./fixtures/twitter/verify_credentials.js')
                    assert.equal(photo, body);
                })
            .unpath()
        .undiscuss()


suite.export(module);
