var async = require('async');
var logger = require(__dirname + "/../../Common/node/logger");
var lutil = require('lutil');
var url = require('url');

var dataStore, dataIn, locker;

// internally we need these for happy fun stuff
exports.init = function(l, dStore, dIn, callback){
    dataStore = dStore;
    dataIn = dIn;
    locker = l;
    callback();
}

// manually walk and reindex all possible link sources
exports.update = function(locker, type, callback) {
    dataStore.clear(type, function(){
        callback();
        var types = (type) ? [type] : ['home/facebook', 'tweets/twitter', 'checkin/foursquare', 'feed/instagram'];
        locker.providers(types, function(err, services) {
            if (!services) return;
            async.forEachSeries(services, function(svc, cb) {
                logger.debug("processing "+svc.id);
                if(svc.provides.indexOf('home/facebook') >= 0) {
                    getData("home/facebook", svc.id, cb);
                } else if(svc.provides.indexOf('tweets/twitter') >= 0) {
                    async.forEachSeries(["tweets/twitter", "timeline/twitter", "mentions/twitter", "related/twitter"], function(type, cb2){ getData(type, svc.id, cb2) }, cb);
                } else if(svc.provides.indexOf('checkin/foursquare') >= 0) {
                    async.forEachSeries(["recents/foursquare", "checkin/foursquare"], function(type, cb2){ getData(type, svc.id, cb2) }, cb);
                } else if(svc.provides.indexOf('feed/instagram') >= 0) {
                    async.forEachSeries(["photo/instagram", "feed/instagram"], function(type, cb2){ getData(type, svc.id, cb2) }, cb);
                } else {
                    cb();
                }
            }, function(err){
                if(type) return logger.debug("done with update for "+type);
                // process links too
                var tot = 0;
                lutil.streamFromUrl(locker.lockerBase+'/Me/links/?full=true&limit=100&stream=true', function(link, cb){
                    tot++;
                    dataIn.processLink({data:link}, cb);
                }, function(err){
                    if(err) logger.error(err);
                    logger.debug(tot+" links processed, done with update");
                });
            });
        });
    });
}

// go fetch data from sources to bulk process
function getData(type, svcId, callback)
{
    var subtype = type.substr(0, type.indexOf('/'));
    var lurl = locker.lockerBase + '/Me/' + svcId + '/getCurrent/' + subtype + "?limit=100&sort=_id&order=-1&stream=true";
    var tot = 0;
    lutil.streamFromUrl(lurl, function(a, cb){
        tot++;
        var idr = getIdr(type, svcId, a);
        dataIn.masterMaster(idr, a, cb);
    }, function(err){
        logger.debug("processed "+tot+" items from "+lurl);
        callback(err);
    });
}

// generate unique id for any item based on it's event
//> u.parse("type://network/context?id=account#46234623456",true);
//{ protocol: 'type:',
//  slashes: true,
//  host: 'network',
//  hostname: 'network',
//  href: 'type://network/context?id=account#46234623456',
//  hash: '#46234623456',
//  search: '?id=account',
//  query: { id: 'account' },
//  pathname: '/context' }
function getIdr(type, via, data)
{
    var r = {slashes:true};
    r.host = type.substr(type.indexOf('/')+1);
    r.pathname = type.substr(0, type.indexOf('/'));
    r.query = {id: via}; // best proxy of account id right now
    dataIn.idrHost(r, data);
    return url.parse(url.format(r),true); // make sure it's consistent
}

