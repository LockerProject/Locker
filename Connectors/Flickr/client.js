/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var extras = 'description,license,date_upload,date_taken,owner_name,icon_server,' +
             'original_format,last_update,geo,tags,machine_tags,o_dims' +
             'views,media,path_alias,url_sq,url_t,url_s,url_m,url_z,url_l,url_o';
             

var debug = true;

var base_url = 'http://api.flickr.com/services/rest/';

var crypto = require('crypto'),
    fs = require('fs'),
    sys = require('sys'),
    request = require('request'),
    connect = require('connect'),
    express = require('express'),
    app = express.createServer(
            connect.bodyParser(),
            connect.cookieParser(),
            connect.session({secret : "locker"})),
    locker = require('../../Common/node/locker.js'),
    lfs = require('../../Common/node/lfs.js');


var state, userInfo, externalUrl;

function getSignature(params) {
    var hash = crypto.createHash('md5');
    params.sort();
    var baseString = auth.apiSecret;
    for(i in params)
        baseString += params[i].replace(/=/, '');
    hash.update(baseString);
    return hash.digest('hex');
}

function getAuthSignedURL(perms) {
    var url = 'http://www.flickr.com/services/auth/?';
    var sig = getSignature(['api_key=' + auth.apiKey,'perms=' + perms]);
    url += 'api_key=' + auth.apiKey + '&perms=' + perms + '&api_sig=' + sig;
    return url;
}

function getSignedMethodURL(method, params) {
    var params2 = [];
    for(i in params) 
        params2.push(params[i]);
    params2.push('method=' + method);
    params2.push('format=json');
    params2.push('api_key=' + auth.apiKey);
    params2.push('nojsoncallback=1');
    api_sig = getSignature(params2);
    var url = base_url +'?api_sig=' + api_sig;
    for(i in params2)
        url += '&' + params2[i];
    return url;
}

function getTokenFromFrob(frob) {
    var url = getSignedMethodURL('flickr.auth.getToken', ['frob=' + frob]);
    request.get({uri:url}, function(err, resp, body) {
        if(err)
            sys.puts('Network Error: ' + sys.inspect(err));
        else {    
            var json = JSON.parse(body);
            for(var i in json.auth)
                auth[i] = json.auth[i];
            lfs.writeObjectToFile('auth.json', auth);
        }
    });
}


function getPhotoThumbURL(photoObject) {
    if(!photoObject || !photoObject.url_sq)
        return null;
    return photoObject.url_sq;
}

function getPhotoURL(photoObject) {
    if(!photoObject)
        return null;
    if(photoObject.url_o)
        return photoObject.url_o;
    if(photoObject.url_l)
        return photoObject.url_l;
    if(photoObject.url_z)
        return photoObject.url_z;
    if(photoObject.url_m)
        return photoObject.url_m;
    if(photoObject.url_s)
        return photoObject.url_s;
    if(photoObject.url_t)
        return photoObject.url_t;
    return null;
}

function constructPhotoURL(photoObject, size) {
    if(!size)
        size = 't';
    return 'http://farm' + photoObject.farm + '.static.flickr.com/' + photoObject.server + '/' 
                    + photoObject.id + '_' + photoObject.secret + '_' + size + '.jpg';
}


app.get('/',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    if(!(auth.apiKey && auth.apiSecret)) {
        res.end("<html>Enter your personal Flickr app info that will be used to sync your data" + 
                " (create a new one <a href='http://www.flickr.com/services/apps/create/apply/' target='_blank'>" + 
                "here</a> using the callback url of " +
                externalUrl+"auth) " +
                "<form method='get' action='save'>" +
                    "API Key: <input name='apiKey'><br>" +
                    "API Secret: <input name='apiSecret'><br>" +
                    "<input type='submit' value='Save'>" +
                "</form></html>");
        return;
    }
    if(!auth.token)
        res.end("<html>you need to <a href='" + getAuthSignedURL('read') + "'>auth w/ flickr</a> yet</html>");
    else
        res.end("<html>found a token, <a href='./friends'>load friends</a> and <a href='./photos'>photos</a></html>");
});

app.get('/save',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    if(!req.param('apiKey') || !req.param('apiSecret')) {
        res.end("missing field(s)?");
        return;
    }
    auth.apiKey = req.param('apiKey');
    auth.apiSecret = req.param('apiSecret');
    lfs.writeObjectToFile('auth.json', auth);
    res.end("<html>k thanks, now we need to <a href='" + getAuthSignedURL('read') + "'>auth that app to your account</a>.</html>");
});


//send the user to flickr for authentication
app.get('/goflickr',
function(req, res) {
    res.redirect(getAuthSignedURL('read'));
});

//flickr callback url
app.get('/auth',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    var frob = req.param('frob');
    getTokenFromFrob(frob);
    res.end("are you ready? yeah!");
});

//download social graph
app.get('/friends',
function(req, res) {
    if(!auth || !auth.token || !auth.token._content) {
        res.redirect('/');
        return;
    }
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    var url = getSignedMethodURL('flickr.contacts.getList',['auth_token=' + auth.token._content]);
    
    try {
        request.get({uri:url}, function(err, resp, body) {
            if(err)
                sys.puts('Network Error: ' + sys.inspect(err));
            else {
                var json = JSON.parse(body);
                lfs.writeObjectsToFile('contacts.json', json.contacts.contact);
                res.end();
            }
        });
    } catch(err) {
    }
});

//get a page of photos and recurse until all pages are completed
function getPhotos(auth_token, username, user_id, page, oldest, newest) {
    try {
        fs.mkdirSync('originals', 0755);
        fs.mkdirSync('thumbs', 0755);
    } catch(err) {
    }
    if(!oldest)
        oldest = 0;
    if(!newest)
        newest = new Date().getTime()/1000;
    var url = getSignedMethodURL('flickr.people.getPhotos',
                                ['auth_token=' + auth_token, 'user_id=' + user_id,
                                 'min_upload_date=' + oldest, 'max_upload_date=' + newest,
                                 'per_page=25', 'page=' + page, 'extras=' + extras]);
    try {
        request.get({uri:url}, function(err, resp, body) {
            if(err)
                sys.puts('Network Error: ' + sys.inspect(err));
            else {
                var json = JSON.parse(body);
                if(!json || !json.photos || !json.photos.photo) {
                    log(body);
                    res.end();
                }
                var photos = json.photos.photo;
                lfs.appendObjectsToFile('photos.json', photos);
                function curl(photos, callback) {
                    if(!photos || photos.length < 1) {
                        callback();
                        return;
                    }
                    var photo = photos.pop();
                    var id = photo.id;
                    lfs.saveUrl(getPhotoThumbURL(photo), 'thumbs/' + id + '.jpg', function(err) {
                        if(err)
                            sys.debug(err)
                        lfs.saveUrl(getPhotoURL(photo), 'originals/' + id + '.jpg', function(err) {
                            if(err)
                                sys.debug(err)
                            log('got flickr photo ' + id);
                            locker.event('photo/flickr', {"_id":id})
                            curl(photos, callback);
                        });
                    });
                }
        
                curl(photos, function() {   
                    if((json.photos.pages - json.photos.page) > 0)
                        getPhotos(auth_token, username, user_id, page + 1, oldest, newest);
                    });
                }
            });
    } catch(err) { console.error(err); }
    
}

//download photos
app.get('/photos', 
function(req, res) {
    if(!auth || !auth.token || !auth.token._content) {
        res.redirect('/');
        return;
    }
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    var now = new Date().getTime()/1000;
    getPhotos(auth.token._content, userInfo.username, 'me', 1, state.newest, now);
    state.newest = now;
    lfs.writeObjectToFile('state.json', state);
    res.write("loading... "+JSON.stringify(state));
    res.end();
});


app.get('/allPhotos',
function(req, res) {
    lfs.readObjectsFromFile('photos.json', function(photos) {
        res.writeHead(200, {
            'Content-Type': 'text/html'
        });
        res.write(JSON.stringify(photos));
        res.end();
    });
});

app.get('/photoObject/*', function(req, res) {
    //TODO: this is reeealy bad! Some sort of DB probably makes way more sense
    lfs.readObjectsFromFile('photos.json', function(photos) {
        var photoNum = req.url.substring(13);
        sys.debug(photoNum);
        var index = photoNum.indexOf('/');
        if(index >= 0)   
            photoNum = photoNum.substring(0, index);
        sys.debug(photoNum);
        for(var i in photos) {
            if(photos[i].id == photoNum) {
                res.writeHead(200);
                res.write(JSON.stringify(photos[i]));
                res.end();
                return;
            }
        }
        res.writeHead(404);
        res.end();
    });
})
app.get('/photo/*', function(req, res) {
    var photoNum = req.url.substring(7);
    var index = photoNum.indexOf('/');
    if(index >= 0)   
        photoNum = photoNum.substring(0, index);
    var stream = fs.createReadStream('originals/' + photoNum + '.jpg');
    var head = false;
    stream.on('data', function(chunk) {
        if(!head) {
            head = true;
            res.writeHead(200, {'Content-Disposition': 'attachment; filename=' + photoNum + '.jpg'});
        }
        res.write(chunk, "binary");
    });
    stream.on('error', function() {
        res.writeHead(404);
        res.end();
    });
    stream.on('end', function() {
        res.end();
    });
});

function log(msg) {
    if(debug) sys.debug(msg);
}

var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    locker.initClient(processInfo);
    externalUrl = processInfo.externalBase;
    process.chdir(processInfo.workingDirectory);
    lfs.readObjectFromFile('auth.json', function(newAuth) {
        auth = newAuth;
        lfs.readObjectFromFile('state.json', function(newLatests) {
            state = newLatests;
            lfs.readObjectFromFile('userInfo.json', function(newUserInfo) {
                userInfo = newUserInfo;
                app.listen(processInfo.port, function() {
                    var returnedInfo = {port: processInfo.port};
                    console.log(JSON.stringify(returnedInfo));
                });
            });
        });
    });
});
