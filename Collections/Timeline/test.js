// BWARE, this is a scratch area used while dev'ing and is pretty ugly as it does a bunch of support work to simulate a working env
// TODO convert to a real unit testing framework
try{
    var lconfig = require('lconfig');
}catch(E){
    console.error("export NODE_PATH=../../Common/node/");
    process.exit();
}
var fs = require('fs');
var url = require('url');
var request = require('request');
lconfig.load('../../Config/config.json');
var lmongoclient = require('../../Common/node/lmongoclient')(lconfig.mongo.host, lconfig.mongo.port, "timelinetest", ["item", "response"]);
var logger = require('../../Common/node/logger');
var async = require("async");
var url = require("url");

var dataIn = require('./dataIn'); // for processing incoming twitter/facebook/etc data types
var dataStore = require("./dataStore"); // storage/retreival of raw items and responses

boot(function(){dataStore.clear(false,testFB)});

function testFB()
{
    dataIn.processEvent(fixture("facebook.update"), function(err){
        if(err) console.error(err);
        count(function(i1, r1){
            dataIn.processEvent(fixture("facebook.update"), function(err){
                if(err) console.error(err);
                count(function(i2, r2){
                    if(i2 != i1) return console.error("didn't dedup facebook.update");
                    if(r2 != r1) return console.error("didn't dedup facebook.update responses");
                    console.error("facebook.update OK");
                    testFBTW();
                });
            })
        });
    })
}

function testFBTW()
{
    dataIn.processEvent(fixture("facebook.tweet"), function(err){
        if(err) console.error(err);
        count(function(i1, r1){
            dataIn.processEvent(fixture("tweet.facebook"), function(err){
                if(err) console.error(err);
                count(function(i2, r2){
                    if(i2 != i1) return console.error("didn't dedup facebook.tweet");
                    if(r2 != r1) return console.error("didn't dedup facebook.tweet responses");
                    console.error("facebook<->twitter OK");
                    testRT();
                });
            })
        });
    })
}

function testRT()
{
    count(function(i1, r1){
        dataIn.processEvent(fixture("twitter.rt"), function(err){
            if(err) console.error(err);
            count(function(i2, r2){
                if(i2 - i1 != 1) return console.error("didn't process twitter.rt");
                if(r2 - r1 != 1) return console.error("didn't process twitter.rt response");
                console.error("ReTweet OK");
                testTWReply()
            });
        })
    });
}

function testTWReply()
{
    count(function(i0, r0){
        dataIn.processEvent(fixture("twitter.reply.orig"), function(err){
            if(err) console.error(err);
            count(function(i1, r1){
                dataIn.processEvent(fixture("twitter.reply"), function(err){
                    if(err) console.error(err);
                    count(function(i2, r2){
                        if(i2 != i1 && i2 - i0 != 1) return console.error("didn't process twitter.reply properly");
                        if(r2 - r1 != 1 || r2 - r0 != 2) return console.error("didn't dedup twitter.reply responses");
                        console.error("twitter reply OK");
                        test4sqLink();
                    });
                })
            });
        })
    });
}

function test4sqLink()
{
    count(function(i0, r0){
        dataIn.processEvent(fixture("foursquare.recents"), function(err){
            if(err) console.error(err);
            count(function(i1, r1){
                dataIn.processEvent(fixture("twitter.timeline"), function(err){
                    if(err) console.error(err);
                    count(function(i2, r2){
                        dataIn.processEvent(fixture("link"), function(err){
                            if(err) console.error(err);
                            count(function(i3, r3){
                                if(i2 - i0 != 2 || i2 - i3 != 1) return console.error("didn't dedup with link properly");
                                if(r3 - r0 != 0) return console.error("found responses and shouldn't have");
                                console.error("link based dedup OK");
                                testIG();
                            });
                        })
                    });
                })
            });
        })
    });
}

function testIG()
{
    count(function(i0, r0){
        dataIn.processEvent(fixture("ig.instagram"), function(err){
            if(err) console.error(err);
            count(function(i1, r1){
                dataIn.processEvent(fixture("ig.fb"), function(err){
                    if(err) console.error(err);
                    count(function(i2, r2){
                        dataIn.processEvent(fixture("ig.tweet"), function(err){
                            if(err) console.error(err);
                            dataIn.processEvent(fixture("ig.4sq"), function(err){
                                if(err) console.error(err);
                                count(function(i3, r3){
                                    if(i3 - i0 != 1) return console.error("didn't dedup instagram properly");
                                    if(r3 - r0 != 0) return console.error("found responses and shouldn't have");
                                    console.error("instagram dedup OK");
                                });
                            })
                        })
                    });
                })
            });
        })
    });
}



function count(callback)
{
    dataStore.getTotalItems(function(err, items){
        dataStore.getTotalResponses(function(err, resp){
//            console.error("Items: "+items+" Responses: "+resp);
            callback(items, resp);
        })
    })
}
function fixture(name)
{
    return JSON.parse(fs.readFileSync(__dirname+"/fixtures/"+name));
}

function boot(callback){
    var tdir = __dirname+"/test";
    try{
        fs.mkdirSync(tdir,0755);
    }catch(E){}
    process.chdir(tdir);
    lmongoclient.connect(function(mongo) {
        // initialize all our libs
        dataStore.init(mongo.collections.item,mongo.collections.response);
        dataIn.init({}, dataStore, function(){
            console.error("booted up");
            callback();
        });
    });
}
