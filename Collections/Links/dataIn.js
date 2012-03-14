var request = require('request');
var util = require('./util');
var async = require('async');
var wrench = require('wrench');
var lutil = require('lutil');
var oembed = require('./oembed');
var crypto = require('crypto');
var url = require('url');
var debug = false;

var dataStore, locker, logger;
// internally we need these for happy fun stuff
exports.init = function(_locker, dStore, log) {
    dataStore = dStore;
    locker = _locker;
    logger = require("logger");
}

// manually walk and reindex all possible link sources
exports.reIndex = function(locker,cb) {
    dataStore.clear(function(){
        cb(); // synchro delete, async/background reindex
        locker.providers(['link/facebook', 'timeline/twitter', 'dashboard/tumblr'], function(err, services) {
            if (!services) return;
            services.forEach(function(svc) {
                if(svc.provides.indexOf('link/facebook') >= 0) {
                    getLinks(getEncounterFB, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/newsfeed', function() {
                        getLinks(getEncounterFB, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/wall', function() {
                            getLinks(getEncounterFB, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/home', function() {
                                logger.info('facebook done!');
                            });
                        });
                    });
                } else if(svc.provides.indexOf('timeline/twitter') >= 0) {
                    getLinks(getEncounterTwitter, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/home_timeline', function() {
                        getLinks(getEncounterTwitter, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/timeline', function() {
                            logger.info('twitter done!');
                        });
                    });
                } else if(svc.provides.indexOf('dashboard/tumblr') >= 0) {
                    getLinks(getEncounterTumblr, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/dashboard', function() {
                        logger.info('tumblr done!');
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
    // TODO: what should we be doing with other action types?
    if(event.action != "new") return callback();
    var idr = url.parse(event.idr);
    if(idr.host === "facebook")
    {
        processEncounter(getEncounterFB(event),callback);
    }else if(idr.host === "twitter") {
        processEncounter(getEncounterTwitter(event),callback);
    }else if(idr.host === "tumblr") {
        processEncounter(getEncounterTumblr(event),callback);
    }else{
        logger.error(idr.host+" unhandled event, shouldn't happen");
        callback();
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
            processEncounter(e,function(err){if(err) logger.error("getLinks error:"+err);});
            cb(); // run pE() async as it queues
        },callback);
    });
}

function processEncounter(e, cb)
{
    dataStore.enqueue(e, function() {
        cb(); // return after we know it's queued
        encounterQueue.push(e, function(arg){
            logger.verbose("Links queue length: "+encounterQueue.length());
        });
    });
    logger.verbose("Links queue length: "+encounterQueue.length());
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
                    dataStore.updateLinkAt(doc.link, doc.at, function(err, obj){
                        if(err) return cb(err);
                        locker.ievent(lutil.idrNew("link","links",obj.id),obj,"update"); // let happen independently
                        cb();
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
            encounterQueue.push(docs[i], function(arg) {
                logger.verbose("Links queue length: " + encounterQueue.length());
            });
        }
    });
}

// given a raw url, result in a fully stored qualified link (cb's full link url)
function linkMagic(origUrl, callback){
    // check if the orig url is in any encounter already (that has a full link url)
    logger.verbose("processing link: "+origUrl);
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
              link.id = crypto.createHash('md5').update(linkUrl).digest('hex');
              util.fetchHTML({url:linkUrl},function(html){link.html = html},function(){
                  // TODO: should we support link rel canonical here and change it?
                  util.extractText(link,function(rtxt){link.title=rtxt.title;link.text = rtxt.text.substr(0,10000)},function(){
                      util.extractFavicon({url:linkUrl,html:link.html},function(fav){link.favicon=fav},function(){
                          // *pfew*, callback nausea, sometimes I wonder...
                          var html = link.html; // cache for oembed module later
                          delete link.html; // don't want that stored
                          if (!link.at) link.at = Date.now();
                          dataStore.addLink(link,function(err, obj){
                              locker.ievent(lutil.idrNew("link","links",obj.id),obj); // let happen independently
                              callback(link.link); // TODO: handle when it didn't get stored or is empty better, if even needed
                              // background fetch oembed and save it on the link if found
                              oembed.fetch({url:link.link, html:html}, function(e){
                                  if(!e) return;
                                  dataStore.updateLinkEmbed(link.link, e, function(){});
                              });
                          });
                      });
                  });
              });
           });
        });
    });
}

// TODO split out text we look for links in from text we want to index!
function getEncounterFB(event)
{
    var post = event.data;
    var text = [];
    if(post.name) text.push(post.name);
    if(post.message) text.push(post.message);
    if(post.link) text.push(post.link);
    if(!post.message && post.caption) text.push(post.caption); // stab my eyes out, wtf facebook
    // todo: handle comments?
    var e = {id:post.id
        , idr:event.idr
        , network:"facebook"
        , text: text.join(" ")
        , from: post.from.name
        , fromID: post.from.id
        , at: post.created_time * 1000
        , via: post
        };
    return e;
}

function getEncounterTwitter(event)
{
    var tweet = event.data;
    var txt = (tweet.retweeted_status && tweet.retweeted_status.text) ? tweet.retweeted_status.text : tweet.text;
    var e = {id:tweet.id
        , idr:event.idr
        , network:"twitter"
        , text: txt + " " + tweet.user.screen_name
        , from: (tweet.user)?tweet.user.name:""
        , fromID: (tweet.user)?tweet.user.id:""
        , at: new Date(tweet.created_at).getTime()
        , via: tweet
        };
    return e;
}

function getEncounterTumblr(event)
{
    var post = event.data;
    var e = {id:post.id
        , idr:event.idr
        , network:"tumblr"
        , text: post.post_url
        , from: post.blog_name
        , fromID: post.blog_name
        , at: new Date(post.date).getTime()
        , via: post
        };
    return e;
}
