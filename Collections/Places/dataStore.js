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
var locker;
var lconfig = require('../../Common/node/lconfig');
var lutil = require('../../Common/node/lutil');
var logger = require("logger").logger;
var request = require("request");
var crypto = require("crypto");
var async = require("async");
var url = require("url");
var fs = require('fs');
var lmongoutil = require("lmongoutil");

function processFoursquare(svcId, type, data, cb) {
    // Gotta have lat/lng/at at minimum
    var loc = (data.venue) ? data.venue.location : data.location; // venueless happens
    if (!loc || !loc.lat || !loc.lng || !data.createdAt) {
        cb("The 4sq data did not have lat/lng or at: "+JSON.stringify(data));
        return;
    }

    var me = false;
    if (type === 'checkin/foursquare') {
        me = true;
    }

    var placeInfo = {
            id:data.id,
            me:me,
            network:"foursquare",
            stream: false,
            lat: loc.lat,
            lng: loc.lng,
            at: data.createdAt * 1000,
            via: '/Me/' + svcId + '/' + type.split('/')[0] + '/id/'+data._id
        };
    placeInfo.title = (data.venue) ? data.venue.name : data.location.name;
    // "checkins" are from yourself, kinda problematic to deal with here?
    if (data.user) {
        placeInfo.fromID = data.user.id;
        placeInfo.from = data.user.firstName + " " + data.user.lastName;
    }
    saveCommonPlace(placeInfo, cb);
}

function processTwitter(svcId, type, data, cb) {
    // Gotta have geo/at at minimum
    if (!data.created_at) {
        cb("The Twitter data did not have created_at");
        return;
    }

    var ll = firstLL(data.geo);
    if (!ll) {
        ll = firstLL(data.place, true);
    }
    if (!ll) {
        ll = firstLL(data.coordinates, true);
    }
    if (!ll) {
        // quietly return, as lots of tweets aren't geotagged, so let's just bail
        cb();
        return;
    }

    var me = false;
    if (type === 'tweets/twitter') {
        me = true;
    }

    var placeInfo = {
            id:data.id_str,
            me:me,
            lat: ll[0],
            lng: ll[1],
            stream: false,
            network:"twitter",
            text: data.text,
            from: (data.user)?data.user.name:"",
            fromID: (data.user)?data.user.id:"",
            at: new Date(data.created_at).getTime(),
            via: '/Me/' + svcId + '/' + type.split('/')[0] + '/id/'+data._id
        };
    saveCommonPlace(placeInfo, cb);
}

function processGLatitude(svcId, type, data, cb) {
    // Gotta have lat/lng/at at minimum
    if (!data.latitude || !data.longitude) {
        cb("The Latitude data did not have latitude or longitude");
        return;
    }

    var timestamp = parseInt(data.timestampMs, 10);
    if (isNaN(timestamp)) {
        cb("The Latitude data did not have a valid timestamp");
        return;
    }

    var me = false;
    if (type === 'location/glatitude') {
        me = true;
    }

    var placeInfo = {
            id:data.timestampMs,
            me:me,
            network:"glatitude",
            stream: true,
            lat: data.latitude,
            lng: data.longitude,
            at: timestamp,
            via: '/Me/' + svcId + '/' + type.split('/')[0] + '/id/'+data._id
        };
    saveCommonPlace(placeInfo, cb);
}

var writeTimer = false;
function updateState() {
    if (writeTimer) {
        clearTimeout(writeTimer);
    }
    writeTimer = setTimeout(function() {
        try {
            lutil.atomicWriteFileSync("state.json", JSON.stringify({updated:new Date().getTime()}));
        } catch (E) {}
    }, 5000);
}

function saveCommonPlace(placeInfo, cb) {
    var hash = createId(placeInfo.lat+':'+placeInfo.lng+':'+placeInfo.at);
    var query = [{id:hash}];

    if (!placeInfo.id) {
        placeInfo.id = hash;
    }
    collection.findAndModify({$or:query}, [['_id','asc']], {$set:placeInfo}, {safe:true, upsert:true, new: true}, function(err, doc) {
        if (err) {
            return cb(err);
        }
        updateState();
        var eventObj = {source: "places", type: "place", data:doc};
        locker.event("place", eventObj);
        return cb(undefined, eventObj);
    });
}

var dataHandlers = {};
dataHandlers["checkin/foursquare"] = processFoursquare;
dataHandlers["recents/foursquare"] = processFoursquare;
dataHandlers["tweets/twitter"] = processTwitter;
dataHandlers["timeline/twitter"] = processTwitter;
dataHandlers["location/glatitude"] = processGLatitude;

exports.init = function(mongoCollection, mongo, l) {
    logger.debug("dataStore init mongoCollection(" + mongoCollection + ")");
    collection = mongoCollection;
    db = mongo.dbClient;
    lconfig.load('../../Config/config.json'); // ugh
    locker = l;
};

exports.getTotalCount = function(callback) {
    collection.count(callback);
};

exports.getAll = function(fields, callback) {
    collection.find({}, fields, callback);
};

exports.get = function(id, callback) {
    collection.findOne({_id: new db.bson_serializer.ObjectID(id)}, callback);
};

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
};

exports.addEvent = function(eventBody, callback) {
    if (eventBody.action !== "new") {
        callback(null, {});
        return;
    }
    // Run the data processing
    var data = (eventBody.obj.data) ? eventBody.obj.data : eventBody.obj;
    var handler = dataHandlers[eventBody.type] || processShared;
    handler(eventBody.via, eventBody.type, data, callback);
};

exports.addData = function(svcId, type, allData, callback) {
    if (callback === undefined) {
        callback = function() {};
    }
    var handler = dataHandlers[type] || processShared;
    async.forEachSeries(allData, function(data, cb) {
        handler(svcId, type, data, function(e){
            if(e) console.error("error processing: "+e);
            cb();
        });
    }, callback);
};

exports.clear = function(callback) {
    collection.drop(callback);
};

exports.getSince = function(objId, cbEach, cbDone) {
    findWrap({"_id":{"$gt":lmongoutil.ObjectID(objId)}}, {sort:{_id:-1}}, collection, cbEach, cbDone);
};

exports.getLastObjectID = function(cbDone) {
    collection.find({}, {fields:{_id:1}, limit:1, sort:{_id:-1}}).nextObject(cbDone);
};

function cleanName(name) {
    if(!name || typeof name !== 'string')
        return name;
    return name.toLowerCase();
}

function createId(hash) {
    var sha1 = crypto.createHash("sha1");
    sha1.update(hash);
    return sha1.digest("hex");
}

function findWrap(a,b,c,cbEach,cbDone) {
    var cursor = c.find(a);
    if (b.sort) cursor.sort(b.sort);
    if (b.limit) cursor.limit(b.limit);
    cursor.each(function(err, item) {
        if (item !== null) {
            cbEach(item);
        } else {
            cbDone();
        }
    });
}

// hack to inspect until we find any [123,456]
function firstLL(o,reversed) {
    if (Array.isArray(o) && o.length == 2 &&
        typeof o[0] == 'number' && typeof o[1] == 'number') {
        return (reversed) ? [o[1],o[0]] : o; // reverse them optionally
    }
    if (typeof o != 'object') {
        return null;
    }
    for (var i in o) {
        var ret = firstLL(o[i]);
        if(ret) return ret;
    }
    return null;
}