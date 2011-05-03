/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

/**
 * web server/service to wrap interactions w/ FB open graph
 */

var _debug = false;

var fs = require('fs'),
    http = require('http'),
    url = require('url'),
    express = require('express'),
    connect = require('connect'),
    sys = require('sys'),
    app = express.createServer(
                    connect.bodyParser(),
                    connect.cookieParser(),
                    connect.session({secret : "locker"})),
    locker = require('../../Common/node/locker.js'),
    lfs = require('../../Common/node/lfs.js');

var wwwdude = require('wwwdude'),
    wwwdude_client = wwwdude.createClient({ encoding: 'binary' });


var me, auth, latests, userInfo;
var facebookClient = require('facebook-js')();


app.set('views', __dirname);
app.get('/',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    if(!auth.appID) {
        res.end("<html>Enter your personal FaceBook app info that will be used to sync your data" + 
                " (create a new one at <a href='http://www.facebook.com/developers/createapp.php'>" + 
                "http://www.facebook.com/developers/createapp.php</a> using the callback url of " +
                "http://"+url.parse(me.uri).host+"/) " +
                "<form method='get' action='save'>" +
                    "App ID: <input name='appID'><br>" +
                    "App Secret: <input name='appSecret'><br>" +
                    "<input type='submit' value='Save'>" +
                "</form></html>");
        return;
    }
    if(!auth.token)
        res.end("<html>you need to <a href='./gofb'>auth w/ fb</a> yet</html>");
    else
        res.end("<html>found a token, <a href='./friends'>load friends</a></html>");
});

app.get('/save',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    if(!req.param('appID') || !req.param('appSecret')) {
        res.end("missing field(s)?");
        return;
    }
    auth.appID = req.param('appID');
    auth.appSecret = req.param('appSecret');
    lfs.writeObjectToFile('auth.json', auth);
    res.end("<html>k thanks, now we need to <a href='./gofb'>auth that app to your account</a>.</html>");
});

app.get('/gofb',
function(req, res) {
    res.redirect(facebookClient.getAuthorizeUrl({
        client_id: auth.appID,
        redirect_uri: me.uri+"auth",
        scope: 'email,offline_access,read_stream,user_photos,friends_photos,publish_stream'
    }));
    res.end();
});

app.get('/auth',
function(req, res) {
    console.log("incoming auth " + req.param('code'));
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    var OAuth = require("oauth").OAuth2;
    var oa = new OAuth(auth.appID, auth.appSecret, 'https://graph.facebook.com');

    oa.getOAuthAccessToken(
    req.param('code'),
    {redirect_uri: me.uri+"auth"},
    function(error, access_token, refresh_token) {
        if (error) {
            sys.debug(error);
            res.end("uhoh " + error);
        } else {
            res.end("<html>too legit to quit: " + access_token + " so now <a href='./friends'>load friends</a></html>");
            auth.token = access_token;
            lfs.writeObjectToFile('auth.json', auth);
        }
    });
});


var photoQueue = [];
var photoIndex = 0;
function downloadPhotos(userID) {
    fs.mkdir('photos/', 0755);
    downloadNextPhoto();
}
function downloadNextPhoto() {
    if (photoIndex >= photoQueue.length) return;

//    var userID = photoQueue[photoIndex].userID;
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

app.get('/allContacts',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });
    lfs.readObjectsFromFile('contacts.json', function(contacts) {
        res.write(JSON.stringify(contacts));
        res.end();
    });
});


app.get('/allPhotos',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });
    fs.readdir('photos/Me', function(err, files) {
        var photoAlbums = [];
        function readNext(callback) {
            var file = files.pop();
            sys.debug('reading file ' + file)
            lfs.readObjectFromFile('photos/Me/' + file + "/meta.json", function(albumInfo) {
                photoAlbums.push(albumInfo);
                if(files.length > 0)
                    readNext(callback);
                else {
                    callback();
                    return;
                }
            });
        }
        readNext(function() {
            res.end(JSON.stringify(photoAlbums));
        });
    });
});

app.get('/friends',
function(req, res) {
    if (!auth.token) {
        res.writeHead(401);
        res.end();
//        res.end("<html>you need to <a href='./gofb'>auth w/ fb</a> yet</html>");
        return;
    } else {
        res.writeHead(200, {
            'Content-Type': 'text/html'
        });
        facebookClient.apiCall('GET', '/me', {access_token: auth.token},
        function(error, result) {
            var userID = result.id;
            facebookClient.apiCall(
            'GET',
            '/me/friends',
            {access_token: auth.token},
            function(error, result) {
                if(error) console.log(error);
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
                res.end("sync'd "+result.data.length+" friends, how sociable!");
            });

            facebookClient.apiCall(
            'GET',
            '/me/checkins',
            {access_token: auth.token},
            function(error, result) {
                if(error) console.log(error);
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
});


app.get('/feed',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    pullNewsFeed(function() {
        locker.at('/feed', 10);
        res.end();
    });
});

function getProfileInfo(userID, callback) {
    if(!callback) {
        callback = userID;
        userID = 'Me';
    }
    facebookClient.apiCall('GET', '/' + userID, {access_token: auth.token}, callback);
}

app.get('/photos',
function(req, res) {
    getPhotoAlbums(function(error, albums) {
        getNextPhotoAlbum(albums.data, function(albumError, album) { //get lists of photos in albums
            var albumFolder = 'photos/Me/' + album.id;
            try {
                fs.mkdirSync('photos/Me', 0755);
            } catch(err) {
                if(_debug) sys.debug(err);
            }
            try {
                fs.mkdirSync(albumFolder, 0755);
            } catch(err) {
                if(_debug) sys.debug(err);
            }
            lfs.writeObjectToFile(albumFolder + '/meta.json', album);
            getPhotos(albumFolder, album.photosList.data, function(photosError) {
                if(error) sys.debug(photosError);
            });
        }, function() {
            //all done
            res.end();
        });
    });
});

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
    getPhotoAlbum(album.id, function(error, photosList) {
        if(_debug) sys.debug('get album: ' + album.id);
        if(error) sys.debug(sys.inspect(error));
        album.photosList = photosList;
        albumCallback(error, album);
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

app.get('/getfeed',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    lfs.readObjectsFromFile('feed.json', function(data) {
        var obj = {};
        obj.data = data;
        res.write(JSON.stringify(obj));
        res.end();
    });
});

function pullNewsFeed(callback) {
    if(!latests.feed)
        latests.feed = {};
    var items = [];
    pullNewsFeedPage(null, latests.feed.latest, items, function() {
        items.reverse();
        locker.diary("saving "+items.length+" new news items");
        lfs.appendObjectsToFile('feed.json', items);
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
        function(error, result) {
            if(error) {
                console.log(JSON.stringify(error));
                return;
            }
            if(result.data.length > 0) {
                var t = result.data[0].updated_time;
                if(!latests.feed.latest || t > latests.feed.latest)
                    latests.feed.latest = t;
                console.log(JSON.stringify(latests));
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


var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    locker.initClient(processInfo);
    process.chdir(processInfo.workingDirectory);
    lfs.readObjectFromFile('auth.json', function(newAuth) {
        auth = newAuth;
        lfs.readObjectFromFile('latests.json', function(newLatests) {
            latests = newLatests;
            lfs.readObjectFromFile('userInfo.json', function(newUserInfo) {
                userInfo = newUserInfo;
                me = lfs.loadMeData();
                app.listen(processInfo.port,function(){
                    var returnedInfo = {port: processInfo.port};
                    console.log(JSON.stringify(returnedInfo));
                });
            });
        });
    });
});
