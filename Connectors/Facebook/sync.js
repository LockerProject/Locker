/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var request = require('request'),
    fs = require('fs'),
    locker = require('../../Common/node/locker.js'),
    lfs = require('../../Common/node/lfs.js');
    
var auth, userInfo, latests;
var facebookClient;

var _debug = false;

exports.init = function(theAuth) {
    auth = theAuth;
    try {
        latests = JSON.parse(fs.readFileSync('latests.json'));
    } catch (err) { latests = {}; }
    try {
        userInfo = JSON.parse(fs.readFileSync('userInfo.json'));
    } catch (err) { userInfo = {}; }    
    facebookClient = require('facebook-js')();
}




var photoQueue = [];
var photoIndex = 0;
function downloadPhotos(userID) {
    fs.mkdir('photos/', 0755);
    downloadNextPhoto();
}
function downloadNextPhoto() {
    if (photoIndex >= photoQueue.length) return;

    var friendID = photoQueue[photoIndex].friendID;
    photoIndex++;
    lfs.curlFile('https://graph.facebook.com/' + friendID + '/picture', 'photos/' + friendID + '.jpg', downloadNextPhoto);
}

function doFQLQuery(access_token, query, callback) {
    var fb = http.createClient(443, 'api.facebook.com', true);
    var request = fb.request('GET', '/method/fql.query?format=json&access_token=' + access_token +
                            '&query=' + escape(query),
                            {'host': 'api.facebook.com'});
    request.end();
    var data = '';
    request.on('response',
    function(response) {
        response.setEncoding('utf8');
        response.on('data',
        function(chunk) {
            data += chunk;
        });
        response.on('end',
        function() {
            callback(data);
        });
    });
}


function getProfileInfo(userID, callback) {
    if(!callback) {
        callback = userID;
        userID = 'Me';
    }
    facebookClient.apiCall('GET', '/' + userID, {access_token: auth.token}, callback);
}

exports.getAllPhotos = function(callback) {
    getPhotoAlbums(function(err, albums) {
        getNextPhotoAlbum(albums.data, function(albumError, album) { //get lists of photos in albums
            var albumFolder = 'photos/Me/' + album.id;
            try {
                fs.mkdirSync('photos/Me', 0755);
            } catch(err) { }
            try {
                fs.mkdirSync(albumFolder, 0755);
            } catch(err) { }
            //TODO check it dir exists
            lfs.writeObjectToFile(albumFolder + '/meta.json', album);
            getPhotos(albumFolder, album.photosList.data, function(photosError) {
                if(err) sys.debug(photosError);
            });
        }, callback);
    });
}

function getPhotoAlbums(userID, callback) {
    if(!callback) {
        callback = userID;
        userID = 'Me';
    }
    facebookClient.apiCall('GET', '/' + userID + '/albums', {access_token: auth.token}, callback);
}

function getNextPhotoAlbum(albums, albumCallback, finalCallback) {
    if(!albums || albums.length < 1) {
        finalCallback();
        return;
    }
    var album = albums.pop();
    getPhotoAlbum(album.id, function(err, photosList) {
        if(_debug) sys.debug('get album: ' + album.id);
        if(err) sys.debug(sys.inspect(err));
        album.photosList = photosList;
        albumCallback(err, album);
        getNextPhotoAlbum(albums, albumCallback, finalCallback);
    });
}

function getPhotoAlbum(albumID, callback) {
    if(_debug) sys.debug('getting album: ' + albumID);
    facebookClient.apiCall('GET', '/' + albumID + '/photos', {access_token: auth.token}, callback);
}

function getPhotos(albumFolder, photos, callback) {
    if(_debug) sys.debug('for ' + albumFolder + ', ' + photos.length + ' remaining.');
    if(!photos || photos.length < 1) {
        callback();
        return;
    }
    var photo = photos.pop();
    var largestURL = photo.images[0].source;
    lfs.curlFile(largestURL, albumFolder + '/' + photo.id + '.jpg');
    getPhotos(albumFolder, photos, callback);
}

exports.pullNewsFeed = function(callback) {
    if(!latests.feed)
        latests.feed = {};
    var items = [];
    pullNewsFeedPage(null, latests.feed.latest, items, function() {
        items.reverse();
        locker.diary("saving "+items.length+" new news items");
        lfs.appendObjectsToFile('feed.json', items);
        locker.at('/feed', 10);
        callback();
    });
}

function pullNewsFeedPage(until, since, items, callback) {
    var params = {access_token: auth.token, limit: 1000};
    if(until)
        params.until = until;
    if(since)
        params.since = since;
    facebookClient.apiCall('GET', '/me/home', params, 
        function(err, result) {
            if(err) {
                console.error(JSON.stringify(err));
                return;
            }
            if(result.data.length > 0) {
                var t = result.data[0].updated_time;
                if(!latests.feed.latest || t > latests.feed.latest)
                    latests.feed.latest = t;
                for(var i = 0; i < result.data.length; i++)
                    items.push(result.data[i]);
                var next = result.paging.next;
                var until = unescape(next.substring(next.lastIndexOf("&until=") + 7));
                pullNewsFeedPage(until, since, items, callback);
            } else if(callback) {
                lfs.writeObjectToFile('latests.json', latests);
                callback();
            }
        });
}

exports.getFriends = function(callback) {
    facebookClient.apiCall('GET', '/me', {access_token: auth.token}, function(err, result) {
        var userID = result.id;
        facebookClient.apiCall('GET', '/me/friends', {access_token: auth.token}, function(err, result) {
            if(err) {
                console.error(err);
                callback(err);
                return;
            }
            locker.diary("syncing "+result.data.length+" friends");
            var stream = fs.createWriteStream('contacts.json');
            for (var i = 0; i < result.data.length; i++) {
                if (result.data[i]) {
                    stream.write(JSON.stringify(result.data[i]) + "\n");
                    if (result.data[i].id) {
                        photoQueue.push({
                            'userID': userID,
                            'friendID': result.data[i].id
                        });
                    }
                }
            }
            stream.end();
            downloadPhotos(userID);
            locker.at('/friends', 3600);
            callback();
        });

        facebookClient.apiCall(
        'GET',
        '/me/checkins',
        {access_token: auth.token},
        function(err, result) {
            if(err) console.error(err);
            locker.diary("syncing "+result.data.length+" places");
            var stream = fs.createWriteStream('places.json');
            for (var i = 0; i < result.data.length; i++) {
                if (result.data[i]) {
                    stream.write(JSON.stringify(result.data[i]) + "\n");
                }
            }
            stream.end();
        });
    });
    
}