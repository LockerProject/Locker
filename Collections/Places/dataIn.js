var dataStore = require('./dataStore');
var url = require('url');

var dataHandlers = {
  "checkin/foursquare": processFoursquare,
  "recents/foursquare": processFoursquare,
  "tweets/twitter": processTwitter,
  "timeline/twitter": processTwitter,
  "location/glatitude": processGLatitude,
  "photo/instagram": processInstagram,
  "feed/instagram": processInstagram
};


function processFoursquare(svcId, type, data, cb) {
    // Gotta have lat/lng/at at minimum
    var loc = data.venue ? data.venue.location : data.location; // venueless happens
    if (!loc || !loc.lat || !loc.lng || !data.createdAt) {
        return cb("The 4sq data did not have lat/lng or at: "+JSON.stringify(data));
    }

    var me = false;
    if (type === 'checkin/foursquare') me = true;

    var placeInfo = {
            me:me,
            network:"foursquare",
            path: false,
            title: (data.venue) ? data.venue.name : data.location.name,
            from: '',
            lat: loc.lat,
            lng: loc.lng,
            at: data.createdAt * 1000,
            via: '/Me/' + svcId + '/' + type.split('/')[0] + '/id/' + data._id
        };

    // "checkins" are from yourself, kinda problematic to deal with here?
    if (data.user) {
        placeInfo.fromID = data.user.id;
        placeInfo.from = '';
        if (data !== null && data.hasOwnProperty('user') && data.user.hasOwnProperty('firstName')) {
            placeInfo.from += data.user.firstName.replace(/^\w/, function($0) { return $0.toUpperCase(); });
        }
        if (data !== null && data.hasOwnProperty('user') && data.user.hasOwnProperty('lastName')) {
            placeInfo.from += ' ' + data.user.lastName.replace(/^\w/, function($0) { return $0.toUpperCase(); });
        }
    } else if (!data.user && me === true) {
        placeInfo.from = 'Me';
    }
    dataStore.saveCommonPlace(placeInfo, cb);
}

function processTwitter(svcId, type, data, cb) {
    // Gotta have geo/at at minimum
    if (!data.created_at) return cb("The Twitter data did not have created_at");

    var title = '';
    if (data !== null && data.hasOwnProperty('place') && data.place !== null && data.place.hasOwnProperty('full_name')) {
        title = data.place.full_name.replace(/\n/g,'').replace(/\s+/g, ' ').replace(/^\w/, function($0) { return $0.toUpperCase(); });
    }

    var ll = firstLL(data.geo) || firstLL(data.coordinates, true) ||
        (data.place !== null && data.place.hasOwnProperty('bounding_box') && computedLL(data.place.bounding_box.coordinates[0]));
    // quietly return, as lots of tweets aren't geotagged, so let's just bail
    if (!ll) return cb();

    var me = false;
    if (type === 'tweets/twitter') me = true;

    var placeInfo = {
            me:me,
            lat: ll[0],
            lng: ll[1],
            path: false,
            title: title,
            network:"twitter",
            text: data.text,
            from: (data.user)?data.user.name.replace(/^\w/, function($0) { return $0.toUpperCase(); }):"",
            fromID: (data.user)?data.user.id:"",
            at: new Date(data.created_at).getTime(),
            via: '/Me/' + svcId + '/' + type.split('/')[0] + '/id/'+data._id
        };
    dataStore.saveCommonPlace(placeInfo, cb);
}

function processInstagram(svcId, type, data, cb) {
    // Gotta have location/at at minimum
    if (!data || !data.created_time || !data.location || !data.location.latitude || !data.location.longitude) {
        return cb();
    }

    var me = false;
    // I think this is probably getting overwritten, fix the right way when we do profiles uniformly
    if (type === 'photo/instagram') me = true;

    var placeInfo = {
            me:me,
            lat: data.location.latitude,
            lng: data.location.longitude,
            path: false,
            title: (data.caption && data.caption.text) ? data.caption.text : '',
            network:"instagram",
            from: (data.user)?data.user.full_name:"",
            fromID: (data.user)?data.user.id:"",
            at: data.created_time * 1000,
            via: '/Me/' + svcId + '/' + type.split('/')[0] + '/id/'+data._id
        };
    dataStore.saveCommonPlace(placeInfo, cb);
}

function processGLatitude(svcId, type, data, cb) {
    // Gotta have lat/lng/at at minimum
    if (!data.latitude || !data.longitude) return cb("The Latitude data did not have latitude or longitude");

    var timestamp = parseInt(data.timestampMs, 10);
    if (isNaN(timestamp)) return cb("The Latitude data did not have a valid timestamp");

    var me = false;
    if (type === 'location/glatitude') me = true;

    var placeInfo = {
            me:me,
            network:"glatitude",
            path: true,
            title: '',
            from: 'Me',
            lat: data.latitude,
            lng: data.longitude,
            at: timestamp,
            via: '/Me/' + svcId + '/' + type.split('/')[0] + '/id/'+data._id
        };
    dataStore.saveCommonPlace(placeInfo, cb);
}


exports.addEvent = function(eventBody, callback) {
    if (eventBody.action !== "new") return callback(null, {});
    // Run the data processing
    var idr = url.parse(eventBody.idr, true);
    var svcId = idr.query["id"];
    var type = idr.pathname.substr(1) + '/' + idr.host
    var handler = dataHandlers[type];
    if (!handler) {
        logger.warn("unhandled "+type);
        return callback();
    }
    handler(svcId, type, eventBody.data, callback);
};

exports.addData = function(svcId, type, allData, callback) {
    if (callback === undefined) callback = function() {};

    var handler = dataHandlers[type];
    if (!handler) {
        logger.warn("unhandled "+type);
        return callback();
    }
    // if called with just one item, streaming
    if(!Array.isArray(allData)) {
        return handler(svcId, type, allData, function(e){
            if(e) logger.error("error processing: "+e);
            callback();
        });
    }
    async.forEachSeries(allData, function(data, cb) {
        handler(svcId, type, data, function(e){
            if(e) logger.error("error processing: "+e);
            cb();
        });
    }, callback);
};


// hack to inspect until we find any [123,456]
function firstLL(o, reversed) {
    if (Array.isArray(o) && o.length == 2 &&
        typeof o[0] == 'number' && typeof o[1] == 'number') {
        return (reversed) ? [o[1],o[0]] : o; // reverse them optionally
    }
    if (typeof o != 'object') return null;
    for (var i in o) {
        var ret = firstLL(o[i], reversed);
        if(ret) return ret;
    }
    return null;
}

// Find center of bounding boxed LL array
function computedLL(box) {
    var allLat = 0;
    var allLng = 0;

    for (var i=0; i<box.length; ++i) {
        allLat += box[i][1];
        allLng += box[i][0];
    }
    var lat = +(allLat / 4).toFixed(5);
    var lng = +(allLng / 4).toFixed(5);

    return [lat, lng];
}