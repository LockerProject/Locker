var config, auth, gdataClient;

exports.sync = function(processInfo, callback) {
    config = processInfo.config;
    auth = processInfo.auth;
    syncContacts(callback);
}

var MAX_RESULTS = 3000;

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
            return callback();
        }
        var responseObj = {data:{}, config:{startIndex: config.startIndex, lastUpdate:now}, auth:auth};
        var entries = result.feed.entry;
        if(entries && entries.length > 0) {
            responseObj.config.lastUpdate = config.lastUpdate;
            responseObj.config.startIndex += entries.length;
            responseObj.config.nextRun = -1;
            responseObj.data.contact = processFeed(entries);
        } else {    
            responseObj.config.startIndex = 1;
            responseObj.config.nextRun = 0;
        }
        callback(null, responseObj);
    });
}


function processFeed(entries) {
    var result = [];
    for(var i in entries) {
        var obj = convertEntry(entries[i]);
        result.push({obj:obj, timestamp:obj.updated, type:'new'});
    }
    return result;
}

function convertEntry(entry) {
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
    for(var i in entry.link) {
        if(entry.link[i].type === 'image/*' && entry.link[i].rel &&
           entry.link[i].rel.lastIndexOf('#photo') === entry.link[i].rel.length - 6) {
            // queuePhoto(obj.id, entry.link[i].href);
            obj.photo = true;
            break;
        }
    }
    if(entry.gContact$groupMembershipInfo) {
        obj.groups = [];
        entry.gContact$groupMembershipInfo.forEach(function(group) {
            obj.groups.push(group.href.substring(group.href.lastIndexOf('/') + 1));
        });
    }
    return obj;
}



function getID(entry) {
    return entry.id.$t.substring(entry.id.$t.lastIndexOf('/') + 1);
}
// 
// var photosQueue = [];
// var gettingPhotos = false;
// 
// function queuePhoto(id, href) {
//     photosQueue.push({id:id, href:href});
//     if(!gettingPhotos) {
//         gettingPhotos = true;
//         getPhotos();
//     }
// }
// 
// function getPhotos() {
//     console.error('photosQueue', photosQueue.length);
//     if(!photosQueue.length) {
//         gettingPhotos = false;
//         return;
//     }
//     var photo = photosQueue.shift();
//     photo.href += '?oauth_token=' + auth.token.access_token;
//     lfs.saveUrl(photo.href, 'photos/' + photo.id + '.jpg', function(err) {
//         // console.error('wrote cont!');
//         getPhotos();
//         // var stat = fs.statSync('photos/' + photo.id + '.jpg');
//         // console.error('stat', stat);
//         if(err) {
//             console.error('error downloading photo for id', id, 'and href', href, '\nerror:', err);
//         }
//     });
// }

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