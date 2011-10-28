var config, auth, gdataClient;
var lfs = require(__dirname + '/../../Common/node/lfs');
var mkdirp = require('mkdirp');

exports.sync = function(processInfo, callback) {
    config = processInfo.config;
    auth = processInfo.auth;
    syncContacts(callback);
}

var MAX_RESULTS = 100;

function syncContacts(callback) {
    var params = {'showdeleted':'true',
                  'sortorder':'ascending',
                  'orderby':'lastmodified',
                  'max-results':MAX_RESULTS
                 };
    if(!config.lastUpdate)
        config.lastUpdate = 1;
    params['updated-min'] = getISODateString(new Date(config.lastUpdate));
    if(!config.startIndex)
        config.startIndex = 1;
    params['start-index'] = config.startIndex;
    var now = Date.now();
    getClient().getFeed('https://www.google.com/m8/feeds/contacts/default/full', params, function(err, result) {
        if(!(result && result.feed) || err || result.error) {
            console.error('google contacts BARF! err=', err, ', result=', result);
            return callback(err);
        }
        var responseObj = {data:{}, config:{startIndex: config.startIndex, lastUpdate:now}, auth:auth};
        var entries = result.feed.entry;
        if(entries && entries.length > 0) {
            responseObj.config.lastUpdate = config.lastUpdate;
            responseObj.config.startIndex += entries.length;
            responseObj.config.nextRun = -1;
            processFeed(entries, function(result) {
                responseObj.data.contact = result;
                return callback(null, responseObj);
            });
        } else {
            responseObj.config.startIndex = 1;
            responseObj.config.nextRun = 0;
            return callback(null, responseObj);
        }
    });
}


function processFeed(entries, callback, result, i) {
    if(!result) result = [];
    if(!i) i = 0;
    else if(i >= entries.length) return callback(result);
    convertEntry(entries[i], function(obj) {            
        result.push({obj:obj, timestamp:obj.updated, type:'new'});    
        processFeed(entries, callback, result, i+1);
    });
}

function convertEntry(entry, callback) {
    var obj = {};
    obj.id = getID(entry);
    if(entry.title && entry.title.$t)
        obj.name = entry.title.$t;
    if(entry.updated && entry.updated.$t)
        obj.updated = Date.parse(entry.updated.$t);
    if(entry.gd$email) {
        obj.email = [];
        for(var i in entry.gd$email) {
            var em = entry.gd$email[i];
            var email = {value:em.address};
            var label = em.label || em.rel;
            label = label.substring(label.lastIndexOf('#') + 1);
            if(label && label != 'other')
                email.type = label;
            obj.email.push(email);
        }
    }
    if(entry.gd$phoneNumber) {
        obj.phone = [];
        for(var i in entry.gd$phoneNumber) {
            var pn = entry.gd$phoneNumber[i];
            var phone = {value:pn.$t};
            var label = pn.label || pn.rel;
            label = label.substring(label.lastIndexOf('#') + 1);
            if(label && label != 'other')
                phone.type = label;
            obj.phone.push(phone);
        }
    }
    if(entry.gd$postalAddress) {
        obj.address = [];
        for(var i in entry.gd$postalAddress) {
            var pa = entry.gd$postalAddress[i];
            var address = {value:pa.$t};
            var label = pa.label || pa.rel;
            label = label.substring(label.lastIndexOf('#') + 1);
            if(label && label != 'other')
                address.type = label;
            obj.address.push(address);
        }
    }
    if(entry.gContact$groupMembershipInfo) {
        obj.groups = [];
        entry.gContact$groupMembershipInfo.forEach(function(group) {
            obj.groups.push(group.href.substring(group.href.lastIndexOf('/') + 1));
        });
    }
    for(var i in entry.link) {
        if(entry.link[i].type === 'image/*' && entry.link[i].rel &&
           entry.link[i].rel.lastIndexOf('#photo') === entry.link[i].rel.length - 6) {
            getPhoto({id:obj.id, href:entry.link[i].href}, function() {
                obj.photo = true;
                callback(obj);
            });
            return;
        }
    }
    // didn't find a photo
    return callback(obj);
}


function getID(entry) {
    return entry.id.$t.substring(entry.id.$t.lastIndexOf('/') + 1);
}

function getPhoto(photo, callback) {
    photo.href += '?oauth_token=' + auth.token.access_token;
    mkdirp('photos', 0755, function(err) {
        if(err) {throw err;}
        // TODO: this might hit and need to handle a 401 (token refresh)
        lfs.saveUrl(photo.href, 'photos/' + photo.id + '.jpg', callback);
    });
}

function getClient() {
    if(auth && !gdataClient) {
        gdataClient = require('gdata-js')(auth.appKey || auth.clientID, auth.appSecret || auth.clientSecret, auth.redirectURI);
        gdataClient.setToken(auth.token);
    }
    return gdataClient;
}

function pad(n){
    return n<10 ? '0'+n : n;
}
function getISODateString(dt){
    return dt.getUTCFullYear() + '-' +
           pad(dt.getUTCMonth() + 1) + '-' + 
           pad(dt.getUTCDate()) + 'T' + 
           pad(dt.getUTCHours()) + ':' + 
           pad(dt.getUTCMinutes()) + ':' +
           pad(dt.getUTCSeconds()) + 'Z';
}