var request = require('request');
var util = require('./util');
var async = require('async');
var logger = require(__dirname + "/../../Common/node/logger").logger;
var lutil = require('lutil');

var dataStore, locker;
// internally we need these for happy fun stuff
exports.init = function(l, dStore){
    dataStore = dStore;
    locker = l;
}

// manually walk and reindex all possible link sources
exports.reIndex = function(locker,cb) {
    dataStore.clear(function(){
        cb(); // synchro delete, async/background reindex
        locker.providers(['checkin/foursquare', 'timeline/twitter'], function(err, services) {
            if (!services) return;
            services.forEach(function(svc) {
                if(svc.provides.indexOf('checkin/foursquare') >= 0) {
                    // lots of naming confusion, try them all
                    getCurrently(do4sq, true, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/places', function(){});
                    getCurrently(do4sq, false, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/recent', function(){});
                    getCurrently(do4sq, false, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/recents', function(){});
                    getCurrently(do4sq, true, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/checkins', function(){});
                    getCurrently(do4sq, true, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/checkin', function(){});
                } else if(svc.provides.indexOf('timeline/twitter') >= 0) {
                    getCurrently(doTwitter, false, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/home_timeline', function() {
                        getCurrently(doTwitter, false, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/timeline', function() {
                            getCurrently(doTwitter, true, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/tweets', function() {
                                console.error('twitter done!');
                            });
                        });
                    });
                }
            });
        });
    });

}

// used by reIndex to fetch and process each service
function getCurrently(getter, me, lurl, callback) {
logger.debug("fetching "+lurl);
    request.get({uri:lurl}, function(err, resp, body) {
        var arr;
        try{
            arr = JSON.parse(body);
        }catch(E){
            return callback();
        }
        async.forEachSeries(arr,function(a,cb){
            var e = getter(a,me);
            processPlace(e,function(err){if(err) console.log("getCurrently error:"+err); cb();});
        },callback);
    });
}

// handle incoming events individually
exports.processEvent = function(event, callback)
{
    if(!callback) callback = function(){};
    // what a mess
    var data = (event.obj.data)?event.obj.data:event.obj;
    var item = (data.sourceObject)?data.sourceObject:data;
    if(event.type.indexOf("foursquare") > 0)
    {
        var me = (event.type.indexOf("checkin") >= 0) ? true : false;
        var status = (item.status)?item.status:item;
        processPlace(do4sq(status, me),callback);
    }
    if(event.type.indexOf("twitter") > 0)
    {
        var me = (event.type.indexOf("tweets") >= 0) ? true : false;
        processPlace(doTwitter(item, me),callback);
    }
}


// placeholder to do more generic place processing
function processPlace(e, cb)
{
    if(!e) return cb();
    dataStore.addPlace(e,cb);
}

// hack to inspect until we find any [123,456]
function firstLL(o,reversed)
{
    if(Array.isArray(o) && o.length == 2 && typeof o[0] == 'number' && typeof o[1] == 'number') {
        return (reversed) ? [o[1],o[0]] : o; // reverse them optionally
    }
    if(typeof o != 'object') return null;
    for(var i in o)
    {
        var ret = firstLL(o[i]);
        if(ret) return ret;
    }
    return null;
}

function do4sq(checkin, me)
{
    if(!checkin.venue || !checkin.venue.location || !checkin.venue.location.lat || !checkin.venue.location.lng) return null;
    var e = {id:checkin.id
        , me:me
        , network:"foursquare"
        , lat: checkin.venue.location.lat
        , lng: checkin.venue.location.lng
        , at: checkin.createdAt * 1000
        , via: checkin
        };
    // "checkins" are from yourself, kinda problematic to deal with here?
    if(checkin.user)
    {
        e.fromID = checkin.user.id;
        e.from = checkin.user.firstName + " " + checkin.user.lastName;
    }
    return e;
}

function doTwitter(tweet, me)
{
    var ll = firstLL(tweet.geo);
    if(!ll) ll = firstLL(tweet.place, true);
    if(!ll) ll = firstLL(tweet.coordinates, true);
    if(!ll) return null;
    var e = {id:tweet.id
        , me:me
        , lat: ll[0]
        , lng: ll[1]
        , network:"twitter"
        , text: tweet.text
        , from: (tweet.user)?tweet.user.name:""
        , fromID: (tweet.user)?tweet.user.id:""
        , at: new Date(tweet.created_at).getTime()
        , via: tweet
        };
    return e;
}
