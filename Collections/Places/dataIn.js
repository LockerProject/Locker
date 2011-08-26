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
exports.reIndex = function(locker) {
    dataStore.clear(function(){
        locker.providers(['checkin/foursquare', 'status/twitter'], function(err, services) {
            if (!services) return;
            services.forEach(function(svc) {
                if(svc.provides.indexOf('checkin/foursquare') >= 0) {
                    getCurrently(do4sq, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/places', function() {
                        getCurrently(do4sq, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/recent', function() {
                            getCurrently(do4sq, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/checkins', function() {
                                console.error('foursquare done!');
                            });
                        });
                    });
                } else if(svc.provides.indexOf('status/twitter') >= 0) {
                    getCurrently(doTwitter, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/home_timeline', function() {
                        getCurrently(doTwitter, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/timeline', function() {
                            getCurrently(doTwitter, locker.lockerBase + '/Me/' + svc.id + '/getCurrent/tweets', function() {
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
function getCurrently(getter, lurl, callback) {
logger.debug("fetching "+lurl);
    request.get({uri:lurl}, function(err, resp, body) {
        var arr;
        try{
            arr = JSON.parse(body);            
        }catch(E){
            return callback();
        }
        async.forEachSeries(arr,function(a,cb){
            var e = getter(a);
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
        processPlace(do4sq(item.status),callback);
    }
    if(event.type.indexOf("twitter") > 0)
    {
        processPlace(doTwitter(item),callback);
    }
}


// placeholder to do more generic place processing
function processPlace(e, cb) 
{
    if(!e) return cb();
    dataStore.addPlace(e,cb);
}

// hack to inspect until we find any [123,456] 
function firstLL(o)
{
    if(Array.isArray(o) && o.length == 2 && typeof o[0] == 'number' && typeof o[1] == 'number') return o;
    if(typeof o != 'object') return null;
    for(var i in o)
    {
        var ret = firstLL(o[i]);
        if(ret) return ret;
    }
    return null;
}

function do4sq(checkin)
{
    if(!checkin.user || !checkin.venue || !checkin.venue.location || !checkin.venue.location.lat || !checkin.venue.location.lng) return null;
    var e = {id:checkin.id
        , network:"foursquare"
        , lat: checkin.venue.location.lat
        , lng: checkin.venue.location.lng
        , at: checkin.createdAt * 1000
        , from: checkin.user.firstName + " " + checkin.user.lastName
        , fromID: checkin.user.id
        , via: checkin
        };
    return e;
}

function doTwitter(tweet)
{
    if(!tweet.place) return null;
    var ll = firstLL(tweet.place);
    if(!ll) return null;
    var e = {id:tweet.id
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
