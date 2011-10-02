var request = require('request');
var async = require('async');
var logger = require(__dirname + "/../../Common/node/logger").logger;
var lutil = require('lutil');
var url = require('url');
var crypto = require("crypto");

var dataStore, locker;

// internally we need these for happy fun stuff
exports.init = function(l, dStore){
    dataStore = dStore;
    locker = l;
}

// manually walk and reindex all possible link sources
exports.update = function(locker, callback) {
    dataStore.clear(function(){
        callback();
        locker.providers(['link/facebook', 'status/twitter', 'checkin/foursquare'], function(err, services) {
            if (!services) return;
            services.forEach(function(svc) {
                if(svc.provides.indexOf('link/facebook') >= 0) {
                    getData("home/facebook", svc.id);
                } else if(svc.provides.indexOf('status/twitter') >= 0) {
                    getData("tweets/twitter", svc.id);
                    getData("timeline/twitter", svc.id);
                    getData("mentions/twitter", svc.id);
                } else if(svc.provides.indexOf('checkin/foursquare') >= 0) {
                    getData("recents/foursquare", svc.id);
                    getData("checkin/foursquare", svc.id);
                }
            });
        });
    });
}

// go fetch data from sources to bulk process
function getData(type, svcId)
{
    var subtype = type.substr(0, type.indexOf('/'));
    var lurl = locker.lockerBase + '/Me/' + svcId + '/getCurrent/' + subtype;
    request.get({uri:lurl, json:true}, function(err, resp, arr) {
        async.forEachSeries(arr,function(a,cb){
            var idr = getIdr(type, svcId, a);
            masterMaster(idr, a, cb);
        },function(err){
            logger.debug("processed "+arr.length+" items from "+lurl+" "+(err)?err:"");
        });
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
    if(r.host === 'twitter')
    {
        r.hash = (r.pathname === 'related') ? data.id : data.id_str;
        r.protocol = 'tweet';
    }
    if(r.host === 'facebook')
    {
        r.hash = data.id;
        r.protocol = 'post';
    }
    if(r.host === 'foursquare')
    {
        r.hash = data.id;
        r.protocol = 'checkin';
    }
    return url.parse(url.format(r)); // make sure it's consistent
}

// take an idr and turn it into a generic network-global key
// this could be network-specific transformation and need data
function idr2key(idr, data)
{
    delete idr.query; delete idr.search; // not account specific
    idr.pathname = '/'; // ids are generic across any context
    return url.parse(url.format(idr));
}

// normalize events a bit
exports.processEvent = function(event, callback)
{
    if(!callback) callback = function(){};
    // handle links as a special case as we're using them for post-process-deduplication
    if(event.type == 'link') return processLink(event, callback);

    var idr = getIdr(event.type, event.via, event.obj.data);
    masterMaster(idr, event.obj.data, callback);
}

function isItMe(idr)
{
    if(idr.protocol == 'tweet:' && idr.pathname == '/tweets') return true;
    if(idr.protocol == 'checkin:' && idr.pathname == '/checkin') return true;
    return false;
}

// figure out what to do with any data
function masterMaster(idr, data, callback)
{
    if(typeof data != 'object') return callback();
//    logger.debug("MM\t"+url.format(idr));
    var ref = url.format(idr);
    var item = {keys:{}, refs:[], froms:{}, from:{}};
    item.ref = ref;
    item.refs.push(ref);
    item.keys[url.format(idr2key(idr, data))] = item.ref;
    item.me = isItMe(idr);
    if(idr.protocol == 'tweet:') itemTwitter(item, data);
    if(idr.protocol == 'post:') itemFacebook(item, data);
    if(idr.protocol == 'checkin:') itemFoursquare(item, data);
    var dup;
    // we're only looking for the first match, if there's more, that's a very odd situation but could be handled here
    async.forEach(Object.keys(item.keys), function(key, cb) {
        dataStore.getItemByKey(key,function(err, doc){
            dup = doc;
            cb(true);
        });
    }, function (err) {
        if(dup) item = itemMerge(dup, item);
        dataStore.addItem(item, function(err, doc){
//            logger.debug("ADDED\t"+JSON.stringify(doc));
            callback();
        });
    });
}

// intelligently merge two items together and return
function itemMerge(older, newer)
{
    logger.debug("MERGE\t"+older.ref+'\t'+newer.ref);
    if(newer.pri > older.pri)
    { // replace top level summary stuff if newer is deemed better
        older.ref = newer.ref;
        older.from = newer.from;
        older.text = newer.text;
        if(newer.title) older.title = newer.title;
    }
    // update timestamps to extremes
    if(newer.last > older.last) older.last = newer.last;
    if(newer.first < older.first) older.first = newer.first;
    // update the two searchable objects
    for(var k in newer.keys) older.keys[k] = newer.keys[k];
    for(var k in newer.froms) older.froms[k] = newer.froms[k];
    // our array of references for this item, needs to be unique
    var refs = {};
    for(var i = 0; i < newer.refs.length; i++) refs[newer.refs[i]]=true;
    for(var i = 0; i < older.refs.length; i++) refs[older.refs[i]]=true;
    older.refs = Object.keys(refs);
    return older;
}

// when a processed link event comes in, check to see if it's a long url that could help us de-dup
function processLink(event, callback)
{
    // look up event via/orig key and see if we've processed it yet, if not (for some reason) ignore
    // if foursquare checkin and from a tweet, generate foursquare key and look for it
    // if from instagram, generate instagram key and look for it
    
    // by here should have the item with the link, and the item for which the link is a target that is a duplicate
    // merge them, merge any responses, delete the lesser
    callback();
}

// extract info from a tweet
function itemTwitter(item, tweet)
{
    item.pri = 1; // tweets are the lowest priority?
    if(tweet.created_at) item.first = item.last = new Date(tweet.created_at).getTime();
    if(tweet.text) item.text = tweet.text;
    if(tweet.user)
    {
        item.from.id = "twitter:"+tweet.user.id;
        item.from.name = tweet.user.name;
        item.from.icon = tweet.user.profile_image_url;
        item.froms[item.from.id] = item.ref;
    }
    // add a text based key
    if(item.text)
    {
        var hash = crypto.createHash('md5');
        hash.update(item.text.substr(0,130)); // ignore trimming variations
        item.keys['text:'+hash.digest('hex')] = item.ref;        
    }
    // if it's tracking a reply, key it too
    if(tweet.in_reply_to_status_id_str) item.keys['tweet://twitter/#'+tweet.in_reply_to_status_id_str] = item.ref;
    // TODO track links for link matching
}

// extract info from a facebook post
function itemFacebook(item, post)
{
    item.pri = 2; // facebook allows more text, always better?
    item.first = post.created_time * 1000;
    item.last = post.updated_time * 1000;
    if(post.from)
    {
        item.from.id = 'facebook:'+post.from.id;
        item.from.name = post.from.name;
        item.from.icon = 'https://graph.facebook.com/' + post.from.id + '/picture';
        item.froms[item.from.id] = item.ref;
    }
    if(post.name) item.title = post.name;
    if(post.message) item.text = post.message;
    if(!post.message && post.caption) item.text = post.caption;
    // should we only add a text key if we can detect it's a tweet? we're de-duping any fb post essentially
    if(item.text)
    {
        var hash = crypto.createHash('md5');
        hash.update(item.text.substr(0,130)); // ignore trimming variations
        item.keys['text:'+hash.digest('hex')] = item.ref;        
    }
}

// extract info from a foursquare checkin
function itemFoursquare(item, checkin)
{
    item.pri = 3; // ideally a checkin should source here as the best
    item.first = item.last = checkin.createdAt * 1000;
    if(checkin.venue) item.text = "Checked in at " + checkin.venue.name;
    if(checkin.user)
    {
        item.from.id = 'foursquare:'+checkin.user.id;
        item.from.name = checkin.user.firstName + " " + checkin.user.lastName;
        item.from.icon = checkin.user.photo;
    }
}
