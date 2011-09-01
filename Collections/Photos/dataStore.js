/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var collection;
var lconfig = require('../../Common/node/lconfig');
var locker = require("../../Common/node/locker");
var logger = require("logger").logger;
var request = require("request");
var crypto = require("crypto");

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

    photoInfo.sources = [{service:svcId, id:data.id}];

    saveCommonPhoto(photoInfo, cb);
}

function processFacebook(svcId, data, cb) {
    var photoInfo = {};

    // Gotta have a url minimum
    if (!data.source) {
        cb("The data did not have a source");
        return;
    }
    photoInfo.url = data.source;
    // TODO:  For now we're just taking the smallest one, there's also an icon field
    if (data.images) photoInfo.thumbUrl = data.images[data.images.length - 1].source;
    if (data.width) photoInfo.width = data.width;
    if (data.height) photoInfo.height = data.height;
    if (data.created_time) photoInfo.timestamp = data.created_time;
    if (data.name) photoInfo.title = data.name;

    photoInfo.sources = [{service:svcId, id:data.id}];

    saveCommonPhoto(photoInfo, cb);
}

function processShared(svcId, data, cb) {
    logger.log("debug", "Shared processing of a pic");

    var commonFields = ["url", "height", "width", "timestamp", "title", "mime-type", "thumbUrl", "size", "caption"];
    if (!data.url) {
        cb("Must have a url");
        return ;
    }
    var photoInfo = {};
    commonFields.forEach(function(fieldName) {
        if (data.hasOwnProperty(fieldName)) photoInfo[fieldName] = data[fieldName];
    });
    if (data.id) photoInfo.sources = [{service:svcId, id:data.id}];

    saveCommonPhoto(photoInfo, cb);
}

function processFlickr(svcId, data, cb) {
    if (!data.id || !data.url_l) {
        cb("The flickr data was invalid");
        return;
    }

    var photoInfo = {};
    photoInfo.url = data.url_l
    if (data.height_l) photoInfo.height = data.height_l;
    if (data.width_l) photoInfo.width = data.width_l;
    if (data.title) photoInfo.title = data.title
    if (data.url_t) photoInfo.thumbnail = data.url_t;
    if (data.datetaken) {
        var d = new Date(data.datetaken);
        photoInfo.timestap = d.getTime();
    }

    photoInfo.sources = [{service:svcId, id:data.id}];

    saveCommonPhoto(photoInfo, cb);

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
//            logger.debug("PHOTODOCO:"+JSON.stringify(doc));
            locker.event("photo", doc, "new");
        }
        cb(err, doc);
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
dataHandlers["photo/twitpic"] = processTwitPic;
dataHandlers["photo/facebook"] = processFacebook;
dataHandlers["photo/flickr"] = processFlickr;

exports.init = function(mongoCollection) {
    logger.debug("dataStore init mongoCollection(" + mongoCollection + ")");
    collection = mongoCollection;
}

exports.getTotalCount = function(callback) {
    collection.count(callback);
}
exports.getAll = function(callback) {
    collection.find({}, callback);
}
exports.getOne = function(id, callback) {
    collection.find({"id":id}, function(error, cursor) {
        if (error) {
            callback(error, null);
        } else {
            cursor.nextObject(function(err, doc) {
                if (err)
                    callback(err);
                else
                    callback(err, doc);
            });
        }
    });
}

exports.processEvent = function(eventBody, callback) {
    // TODO:  Handle the other actions appropiately
    if (eventBody.action != "new") {
        callback();
        return;
    }
    // Run the data processing
    var data = eventBody.obj;
    if(eventBody.via && eventBody.via.indexOf("synclet") == 0) data = eventBody.obj.data;
    var handler = dataHandlers[eventBody.type] || processShared;
    handler(eventBody.via, data, callback);
}

exports.addData = function(svcId, type, allData, callback) {
    if (callback === undefined) {
        callback = function() {};
    }
    var handler = dataHandlers[type] || processShared;
    allData.forEach(function(data) {
        handler(svcId, data, callback);
    });
}

exports.clear = function(callback) {
    collection.drop(callback);
}

function cleanName(name) {
    if(!name || typeof name != 'string')
        return name;
    return name.toLowerCase();
}
