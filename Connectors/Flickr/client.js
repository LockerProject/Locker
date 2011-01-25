var extras = 'description,license,date_upload,date_taken,owner_name,icon_server,' +
             'original_format,last_update,geo,tags,machine_tags,o_dims' +
             'views,media,path_alias,url_sq,url_t,url_s,url_m,url_z,url_l,url_o';
             

var api_key = process.argv[2];
var api_secret = process.argv[3];


var base_url = 'http://api.flickr.com/services/rest/';

var crypto = require('crypto'),
    fs = require('fs'),
    connect = require('connect'),
    express = require('express'),
    app = express.createServer(
            connect.bodyDecoder(),
            connect.cookieDecoder(),
            connect.session());

var lfs = require('../common/node/lfs');

var wwwdude = require('wwwdude');
var wwwdude_client = wwwdude.createClient({
    encoding: 'utf-8'
});

var meta;
try {
    meta = lfs.readMetadata();
} catch(err) {
}

function getSignature(params) {
    var hash = crypto.createHash('md5');
    params.sort();
    var baseString = api_secret;
    for(i in params)
        baseString += params[i].replace(/=/, '');
    hash.update(baseString);
    return hash.digest('hex');
}

function getAuthSignedURL(perms) {
    var url = 'http://www.flickr.com/services/auth/?';
    var sig = getSignature(['api_key=' + api_key,'perms=' + perms]);
    url += 'api_key=' + api_key + '&perms=' + perms + '&api_sig=' + sig;
    return url;
}

function getSignedMethodURL(method, params) {
    var params2 = [];
    for(i in params) 
        params2.push(params[i]);
    params2.push('method=' + method);
    params2.push('format=json');
    params2.push('api_key=' + api_key);
    params2.push('nojsoncallback=1');
    api_sig = getSignature(params2);
    var url = base_url +'?api_sig=' + api_sig;
    for(i in params2)
        url += '&' + params2[i];
    return url;
}

function getTokenFromFrob(frob) {
    var url = getSignedMethodURL('flickr.auth.getToken', ['frob=' + frob]);
    wwwdude_client.get(url)
    .addListener('error',
    function(err) {
        sys.puts('Network Error: ' + sys.inspect(err));
    })
    .addListener('http-error',
    function(data, resp) {
        sys.puts('HTTP Error for: ' + resp.host + ' code: ' + resp.statusCode);
    })
    .addListener('success',
    function(data, resp) {
        var json = JSON.parse(data);
        json.auth.state = {};
        if(meta && meta.state && meta.state.newest)
            json.auth.state.newest = meta.state.newest;
        else
            json.auth.state.newest = 0;
        meta = json.auth;
        lfs.writeMetadata(json.auth.user.username, meta);
    }).send();
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
    return null;
}

function constructPhotoURL(photoObject, size) {
    if(!size)
        size = 't';
    return 'http://farm' + photoObject.farm + '.static.flickr.com/' + photoObject.server + '/' 
                    + photoObject.id + '_' + photoObject.secret + '_' + size + '.jpg';
}

//send the user to flickr for authentication
app.get('/',
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
    res.end();
});

//download social graph
app.get('/friends',
function(req, res) {
    if(!meta || !meta.token || !meta.token._content) {
        res.redirect('/');
        return;
    }
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    var url = getSignedMethodURL('flickr.contacts.getList',['auth_token=' + meta.token._content]);
    
    try {
        wwwdude_client.get(url)
        .addListener('error',
        function(err) {
            sys.puts('Network Error: ' + sys.inspect(err));
        })
        .addListener('http-error',
        function(data, resp) {
            sys.puts('HTTP Error for: ' + resp.host + ' code: ' + resp.statusCode);
        })
        .addListener('success',
        function(data, resp) {
            var json = JSON.parse(data);
            lfs.writeObjectsToFile('my/' + meta.user.username + '/contacts.json', json.contacts.contact);
            res.end();
        }).send();
    } catch(err) {
    }
});

//get a page of photos and recurse until all pages are completed
function getPhotos(auth_token, username, user_id, page, oldest, newest) {
    try {
        fs.mkdirSync('my/' + username + '/originals', 0755);
        fs.mkdirSync('my/' + username + '/thumbs', 0755);
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
        wwwdude_client.get(url)
        .addListener('error',
        function(err) {
            sys.puts('Network Error: ' + sys.inspect(err));
        })
        .addListener('http-error',
        function(data, resp) {
            sys.puts('HTTP Error for: ' + resp.host + ' code: ' + resp.statusCode);
        })
        .addListener('success',
        function(data, resp) {
            var json = JSON.parse(data);
            if(!json || !json.photos || !json.photos.photo) {
                console.log(data);
                res.end();
            }
        
            var photos = json.photos.photo;
            lfs.appendObjectsToFile('my/' + meta.user.username + '/photos.json', photos);
            for(i in photos) {
                if(!photos[i])
                    continue;
                lfs.writeURLContentsToFile(meta.user.username, 
                                           getPhotoThumbURL(photos[i]),
                                          'thumbs/' + photos[i].id + '.jpg', 'binary', 3);
                lfs.writeURLContentsToFile(meta.user.username, 
                                           getPhotoURL(photos[i]), 
                                           'originals/' + photos[i].id + '.jpg', 'binary', 3);
            }
            if((json.photos.pages - json.photos.page) > 0)
                getPhotos(auth_token, username, user_id, page + 1, oldest, newest);
        }).send();
    } catch(err) { console.log(JSON.stringify(err)); }
    
}

//download photos
app.get('/photos', 
function(req, res) {
    if(!meta || !meta.token || !meta.token._content) {
        res.redirect('/');
        return;
    }
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    var now = new Date().getTime()/1000;
    getPhotos(meta.token._content, meta.user.username, 'me', 1, meta.state.newest, now);
    meta.state.newest = now;
    lfs.writeMetadata(meta.user.username, meta);
    res.write(JSON.stringify(meta));
    res.end();
});



console.log('server listening on http://localhost:3006/');
app.listen(3006);