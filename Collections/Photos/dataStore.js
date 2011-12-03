/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var collection;
var db;
var lconfig;
var lutil = require('../../Common/node/lutil');
var logger
var request = require("request");
var crypto = require("crypto");
var async = require("async");
var url = require("url");
var fs = require('fs');
var url = require('url');
var lmongoutil = require("lmongoutil");
var locker;

function processTwitPic(svcId, data, cb) {
    if (!data.id) {
        cb("The twitpic data was invalid");
        return;
    }

    var photoInfo = {};
    photoInfo.url = lconfig.lockerBase + "/Me/" + svcId + "/full/" + data.id;
    if (data.txt) photoInfo.title = data.txt;
    if (data.thumb) photoInfo.thumbnail = data.thumb;
    photoInfo.timestamp = Date.now();

    photoInfo.sources = [{service:svcId, id:data.id, data:data}];

    saveCommonPhoto(photoInfo, cb);
}


var fbProfile;
function getFacebookProfile(callback) {
    if(fbProfile) return callback();
    request.get({uri:lconfig.lockerBase + '/synclets/facebook/get_profile', json:true}, function(err, resp, profile) {
        fbProfile = profile;
        callback();
    });
}
function processFacebook(svcId, data, cb) {
    getFacebookProfile(function() {
        var photoInfo = {};

        // Gotta have a url minimum
        if (!data.source) {
            cb("The data did not have a source");
            return;
        }
        photoInfo.url = data.source;
        // TODO:  For now we're just taking the smallest one, there's also an icon field
        if (data.images) photoInfo.thumbnail = data.images[data.images.length - 1].source;
        if (data.width) photoInfo.width = data.width;
        if (data.height) photoInfo.height = data.height;
        if (data.created_time) photoInfo.timestamp = data.created_time*1000;
        if (data.name) photoInfo.title = data.name;
        if (data.link) photoInfo.sourceLink = data.link;

        photoInfo.sources = [{service:svcId, id:data.id, data:data}];
        photoInfo.me = (data.from.id == fbProfile.id);
        saveCommonPhoto(photoInfo, cb);
    });
}

function processInstagram(svcId, data, cb) {
    var photoInfo = {};

    // Gotta have a url minimum
    if (!data.images || !data.images.standard_resolution) {
        cb("The data did not have a source");
        return;
    }
    photoInfo.url = data.images.standard_resolution.url;
    photoInfo.width = data.images.standard_resolution.width;
    photoInfo.height = data.images.standard_resolution.height;
    if (data.images.thumbnail) photoInfo.thumbnail = data.images.thumbnail.url;
    if (data.created_time) photoInfo.timestamp = data.created_time*1000;
    if (data.caption) photoInfo.title = data.caption.text;
    if (data.link) photoInfo.sourceLink = data.link;

    photoInfo.sources = [{service:svcId, id:data.id, data:data}];

    saveCommonPhoto(photoInfo, cb);
}

function getFlickrItem(photoObject, field) {
    return photoObject[field + '_o'] || photoObject[field + '_l'] || photoObject[field + '_z'] ||
           photoObject[field + '_m'] || photoObject[field + '_s'] || photoObject[field + '_t'];
}

function processFlickr(svcId, data, cb) {
    if (!data.id || !getFlickrItem(data, 'url')) {
        cb("The flickr data was invalid");
        return;
    }

    var photoInfo = {};
    photoInfo.url = getFlickrItem(data, 'url');
    photoInfo.height = getFlickrItem(data, 'height');
    photoInfo.width = getFlickrItem(data, 'width');
    if (data.title) photoInfo.title = data.title
    if (data.url_t) photoInfo.thumbnail = data.url_t;
    if (data.owner && data.id) photoInfo.sourceLink = "http://www.flickr.com/photos/" + data.owner + "/" + data.id + "/";
    if (data.datetaken) {
        var d = new Date(data.datetaken);
        photoInfo.timestamp = d.getTime();
    }

    photoInfo.sources = [{service:svcId, id:data.id, data:data}];

    saveCommonPhoto(photoInfo, cb);

}

// pretty experimental! extract photos from your tweets using embedly :)
function processTwitter(svcId, data, cb)
{
    logger.verbose('processTwitter!');
    if(!data || !data.entities || !Array.isArray(data.entities.urls)) return cb();

    async.forEach(data.entities.urls,function(u,callback){
        if(!u || !u.url) return callback();
        var embed = url.parse(lconfig.lockerBase+"/Me/links/embed");
        var turl = (u.expanded_url) ? u.expanded_url : u.url;
        logger.verbose('found twitter url:' + turl);
        embed.query = {url:turl};
        request.get({uri:url.format(embed), json:true},function(err,resp,js){
            if(err || !js) return callback();
            if(!js || !js.type || js.type != "photo" || !js.url) return callback();
            logger.verbose('found twitter photo! ' +  turl);
            var photoInfo = {};
            photoInfo.url = js.url;
            if (js.height) photoInfo.height = js.height;
            if (js.width) photoInfo.width = js.width;
            photoInfo.title = data.text;
            if (js.thumbnail_url) photoInfo.thumbnail = js.thumbnail_url;
            if (data.created_at) photoInfo.timestamp = new Date(data.created_at).getTime();
            photoInfo.sourceLink = "http://twitter.com/#!/" + data.user.screen_name + "/status/" + data.id_str;

            photoInfo.sources = [{service:svcId, id:data.id, data:data}];
            saveCommonPhoto(photoInfo, callback);
        });
    },function(){ // example: https://api.twitter.com/1/statuses/show/121716701338402817.json?include_entities=true
        if(!Array.isArray(data.entities.media)) return cb();
        async.forEach(data.entities.media,function(m,callback){
            if(!m || !m.media_url) return callback();
            var photoInfo = {};
            photoInfo.url = m.media_url;
            if (m.sizes.large) {
                photoInfo.height = m.sizes.large.h;
                photoInfo.width = m.sizes.large.w;
            }
            photoInfo.title = data.text;
            if (data.created_at) photoInfo.timestamp = new Date(data.created_at).getTime();
            photoInfo.sourceLink = "http://twitter.com/#!/" + data.user.screen_name + "/status/" + data.id_str;
            photoInfo.sources = [{service:svcId, id:data.id, data:data}];
            saveCommonPhoto(photoInfo, callback);
        },cb);
    });
}

// look at all checkins, see if any contain attached photos
function processFoursquare(svcId, data, cb)
{
    if(!data || !data.photos || !Array.isArray(data.photos.items)) return cb();
    var photoInfo = {};

    async.forEach(data.photos.items,function(photo,callback){
        if(!photo || !photo.sizes || !Array.isArray(photo.sizes.items) || photo.sizes.items.length == 0) return callback();
        photoInfo = {};
        photoInfo.url = photo.sizes.items[0].url;
        if (photo.sizes.items[0].height) photoInfo.height = photo.sizes.items[0].height;
        if (photo.sizes.items[0].width) photoInfo.width = photo.sizes.items[0].width;
        if (data.venue.name) photoInfo.title = data.venue.name;
        photoInfo.thumbnail = photo.sizes.items[photo.sizes.items.length-2].url;
        if (data.createdAt) photoInfo.timestamp = new Date(data.createdAt).getTime() * 1000;
        photoInfo.sourceLink = "http://foursquare.com/user/" + photo.user.id + "/checkin/" + data.id;

        photoInfo.sources = [{service:svcId, id:photo.id, data:data}];
        saveCommonPhoto(photoInfo, function(err, data) { photoInfo = data; callback(err);});
    }, function(err) { cb(err, photoInfo); });
}

var writeTimer = false;
function updateState()
{
    if (writeTimer) {
        clearTimeout(writeTimer);
    }
    writeTimer = setTimeout(function() {
        try {
            lutil.atomicWriteFileSync("state.json", JSON.stringify({updated:new Date().getTime()}));
        } catch (E) {}
    }, 5000);
}

function saveCommonPhoto(photoInfo, cb) {
    // This is the only area we do basic matching on right now.  We'll do more later
    var query = [{url:photoInfo.url}];
    if (photoInfo.title) {
        query.push({name:photoInfo.title});
    }
    if (!photoInfo.id) photoInfo.id = createId(photoInfo.url, photoInfo.name);
    collection.findAndModify({$or:query}, [['_id','asc']], {$set:photoInfo}, {safe:true, upsert:true, new: true}, function(err, doc) {
        if (!err) {
            updateState();
            locker.ievent(lutil.idrNew("photo", "photos", doc.id), doc);
            return cb(undefined, doc);
        }
        cb(err);
    });
}

/**
* Common function to create an id attribute for a photo entry
*
* This currently uses the only matched attributes of the url and the name to generate a hash.
*/
function createId(url, name) {
    var sha1 = crypto.createHash("sha1");
    sha1.update(url);
    if (name) sha1.update(name);
    return sha1.digest("hex");
}


var dataHandlers = {};
dataHandlers["timeline/twitter"] = processTwitter;
dataHandlers["tweets/twitter"] = processTwitter;
dataHandlers["checkin/foursquare"] = processFoursquare;
dataHandlers["photo/twitpic"] = processTwitPic;
dataHandlers["photo/facebook"] = processFacebook;
dataHandlers["photo/flickr"] = processFlickr;
dataHandlers["photo/instagram"] = processInstagram;

exports.init = function(mongoCollection, mongo, l, config) {
    collection = mongoCollection;
    db = mongo.dbClient;
    locker = l;
    lconfig = config;
    logger = require("logger");
}

exports.getTotalCount = function(callback) {
    collection.count(callback);
}
exports.getAll = function(fields, callback) {
    collection.find({}, fields, callback);
}

exports.get = function(id, callback) {
    var or = []
    try {
        or.push({_id:new db.bson_serializer.ObjectID(id)});
    }catch(E){}
    or.push({id:id});
    collection.findOne({$or:or}, callback);
}

exports.addEvent = function(eventBody, callback) {
    // TODO:  Handle the other actions appropiately
    if (eventBody.action !== "new") {
        callback(null, {});
        return;
    }
    // Run the data processing
    var idr = url.parse(eventBody.idr, true);
    var svcId = idr.query["id"];
    var type = idr.pathname.substr(1) + '/' + idr.host
    var handler = dataHandlers[type];
    if(!handler)
    {
        console.error("unhandled "+type);
        return callback();
    }
    handler(svcId, eventBody.data, callback);
}

exports.addData = function(svcId, type, allData, callback) {
    if (callback === undefined) {
        callback = function() {};
    }
    var handler = dataHandlers[type];
    if(!handler)
    {
        console.error("unhandled "+type);
        return callback();
    }
    async.forEachSeries(allData,function(data,cb) {
        handler(svcId, data, cb);
    },callback);
}

exports.clear = function(callback) {
    collection.drop(callback);
}

function cleanName(name) {
    if(!name || typeof name != 'string')
        return name;
    return name.toLowerCase();
}

exports.getSince = function(objId, cbEach, cbDone) {
    findWrap({"_id":{"$gt":lmongoutil.ObjectID(objId)}}, {sort:{_id:-1}}, collection, cbEach, cbDone);
}

exports.getLastObjectID = function(cbDone) {
    collection.find({}, {fields:{_id:1}, limit:1, sort:{_id:-1}}).nextObject(cbDone);
}

function findWrap(a,b,c,cbEach,cbDone){
    var cursor = c.find(a);
    if (b.sort) cursor.sort(b.sort);
    if (b.limit) cursor.limit(b.limit);
    cursor.each(function(err, item) {
        if (item != null) {
            cbEach(item);
        } else {
            cbDone();
        }
    });
}

