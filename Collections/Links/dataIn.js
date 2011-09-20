var request = require('request');
var util = require('./util');
var async = require('async');
var wrench = require('wrench');
var logger = require(__dirname + "/../../Common/node/logger").logger;
var lutil = require('lutil');

var dataStore, locker, search;
// internally we need these for happy fun stuff
exports.init = function(l, dStore, s){
    dataStore = dStore;
    locker = l;
    search = s;
}

// manually walk and reindex all possible link sources
exports.reIndex = function(locker,cb) {
    search.resetIndex();
    dataStore.clear(function(){
        cb(); // synchro delete, async/background reindex
        locker.providers(['link/facebook', 'status/twitter'], function(err, services) {
            if (!services) return;
            services.forEach(function(svc) {
                if(svc.provides.indexOf('link/facebook') >= 0) {
                    getLinks(getEncounterFB, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/newsfeed', function() {
                        getLinks(getEncounterFB, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/wall', function() {
                            getLinks(getEncounterFB, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/home', function() {
                                console.error('facebook done!');
                            });
                        });
                    });
                } else if(svc.provides.indexOf('status/twitter') >= 0) {
                    getLinks(getEncounterTwitter, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/home_timeline', function() {
                        getLinks(getEncounterTwitter, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/timeline', function() {
                            console.error('twitter done!');
                        });
                    });
                }
            });
        });
    });
}

// handle incoming events individually
exports.processEvent = function(event, callback)
{
    if(!callback) callback = function(){};
    // TODO: should we be only tracking event.action = new?
    // what a mess
    var item = (event.obj.data.sourceObject)?event.obj.data.sourceObject:event.obj.data;
    if(event.type.indexOf("facebook") > 0)
    {
        processEncounter(getEncounterFB(item),callback);
    }
    if(event.type.indexOf("twitter") > 0)
    {
        processEncounter(getEncounterTwitter(item),callback);
    }
}

// used by reIndex to fetch and process each service
function getLinks(getter, lurl, callback) {
    request.get({uri:lurl}, function(err, resp, body) {
        var arr;
        try{
            arr = JSON.parse(body);
        }catch(E){
            return callback();
        }
        async.forEachSeries(arr,function(a,cb){
            var e = getter(a);
            if(!e.text) return cb();
            processEncounter(e,function(err){if(err) console.log("getLinks error:"+err);});
            cb(); // run pE() async as it queues
        },callback);
    });
}

function processEncounter(e, cb)
{
    dataStore.enqueue(e, function() {
        encounterQueue.push(e, function(arg){
            console.error("QUEUE SIZE: "+encounterQueue.length());
            cb();
        });
    });
    console.error("QUEUE SIZE: "+encounterQueue.length());
}

var encounterQueue = async.queue(function(e, callback) {
    // immediately dequeue in case processing makes something go wrong
    dataStore.dequeue(e);
    // do all the dirty work to store a new encounter
    var urls = [];
    // extract all links
    util.extractUrls({text:e.text},function(u){ urls.push(u); }, function(err){
        if(err) return callback(err);
        // for each one, run linkMagic on em
        if (urls.length === 0) return callback();
        async.forEach(urls,function(u,cb){
            linkMagic(u,function(link){
                // make sure to pass in a new object, asyncutu
                dataStore.addEncounter(lutil.extend(true,{orig:u,link:link},e), function(err,doc){
                    if(err) return cb(err);
                    dataStore.updateLinkAt(doc.link, doc.at, function() {
                        search.index(doc.link, function() {
                            cb()
                        });
                    });
                }); // once resolved, store the encounter
            });
        }, callback);
    });
}, 5);

exports.loadQueue = function() {
    dataStore.fetchQueue(function(err, docs) {
        if(!docs) return;
        for (var i = 0; i < docs.length; i++) {
            encounterQueue.push(docs[i].obj, function(arg) {
                console.error("QUEUE SIZE: " + encounterQueue.length());
            });
        }
    });
}

// given a raw url, result in a fully stored qualified link (cb's full link url)
function linkMagic(origUrl, callback){
    // check if the orig url is in any encounter already (that has a full link url)
    dataStore.checkUrl(origUrl,function(linkUrl){
        if(linkUrl) return callback(linkUrl); // short circuit!
        // new one, expand it to a full one
        util.expandUrl({url:origUrl},function(u2){linkUrl=u2},function(){
           // fallback use orig if errrrr
           if(!linkUrl) {
               linkUrl = origUrl;
            }
           var link = false;
           // does this full one already have a link stored?
           dataStore.getLinks({link:linkUrl,limit:1},function(l){link=l},function(err){
              if(link) {
                  return callback(link.link); // yeah short circuit dos!
              }
              // new link!!!
              link = {link:linkUrl};
              util.fetchHTML({url:linkUrl},function(html){link.html = html},function(){
                  util.extractText(link,function(rtxt){link.title=rtxt.title;link.text = rtxt.text},function(){
                      util.extractFavicon({url:linkUrl,html:link.html},function(fav){link.favicon=fav},function(){
                          // *pfew*, callback nausea, sometimes I wonder...
                          delete link.html; // don't want that stored
                          if (!link.at) link.at = Date.now();
                          dataStore.addLink(link,function(){
                              locker.event("link",link); // let happen independently
                              callback(link.link); // TODO: handle when it didn't get stored or is empty better, if even needed
                          });
                      });
                  });
              });
           });
        });
    });
}

// TODO split out text we look for links in from text we want to index!
function getEncounterFB(post)
{
    var text = [];
    if(post.name) text.push(post.name);
    if(post.message) text.push(post.message);
    if(post.link) text.push(post.link);
    if(!post.message && post.caption) text.push(post.caption); // stab my eyes out, wtf facebook
    // todo: handle comments?
    var e = {id:post.id
        , network:"facebook"
        , text: text.join(" ")
        , from: post.from.name
        , fromID: post.from.id
        , at: post.created_time * 1000
        , via: post
        };
    return e;
}

function getEncounterTwitter(tweet)
{
    var e = {id:tweet.id
        , network:"twitter"
        , text: tweet.text + " " + tweet.user.screen_name
        , from: (tweet.user)?tweet.user.name:""
        , fromID: (tweet.user)?tweet.user.id:""
        , at: new Date(tweet.created_at).getTime()
        , via: tweet
        };
    return e;
}
