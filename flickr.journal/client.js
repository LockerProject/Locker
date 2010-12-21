var api_key = 'ad5010e2e470732487efb8e397e709ef';
var api_secret = '553d0f5aca6bbb32';


var base_url = 'http://api.flickr.com/services/rest/';

var crypto = require('crypto'),
    connect = require('connect'),
    express = require('express'),
    app = express.createServer(
            connect.bodyDecoder(),
            connect.cookieDecoder(),
            connect.session());

var lfs = require('./lfs');

var wwwdude = require('wwwdude');
var wwwdude_client = wwwdude.createClient({
    encoding: 'utf-8'
});

var meta;
try {
    meta = lfs.readMetadata();
    console.log(JSON.stringify(meta));
} catch(err) {
    console.log(JSON.stringify(err));
}

function getSignature(params) {
    var hash = crypto.createHash('md5');
    hash.update(api_secret + params.sort().join().replace(/(=|,)/g, ''));
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
            try {
                var json = JSON.parse(data);
                meta = json.auth;
                lfs.writeMetadata(json.auth.user.username, meta);
                console.log(JSON.stringify(meta));
                res.end();
            } catch(err) { }
        }).send();
    } catch(err) {
    }
}

function getPhotoURL(photoObject, size) {
    //http://farm{farm-id}.static.flickr.com/{server-id}/{id}_{secret}_[mstzb].jpg
    if(!size)
        size = 't';
    return 'http://farm' + photoObject.farm + '.static.flickr.com/' + photoObject.server + '/' 
                    + photoObject.id + '_' + photoObject.secret + '_' + size + '.jpg';
}

app.get('/',
function(req, res) {
    res.redirect(getAuthSignedURL('read'));
});

app.get('/auth',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    var frob = req.param('frob');
    getTokenFromFrob(frob);  
});


app.get('/friends',
function(req, res) {
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
            try {
                console.log(data);
                var json = JSON.parse(data);
                res.end();
            } catch(err) { }
        }).send();
    } catch(err) {
    }
});

app.get('/photos', 
function(req, res) {
    var url = getSignedMethodURL('flickr.people.getPhotos',['auth_token=' + meta.token._content, 'user_id=me']);
    
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
            try {
  //              console.log(data);
                var json = JSON.parse(data);
                var photos = json.photos.photo;
                console.log(JSON.stringify(photos));
                for(i in photos) {
                    console.log(getPhotoURL(photos[i]));
                    lfs.writeURLContentsToFile(meta.user.username, getPhotoURL(photos[i]), photos[i].id + '.jpg', 'binary');
                }
                res.end();
            } catch(err) { }
        }).send();
    } catch(err) {
    }
});




console.log('server listening on http://localhost:3006/');
app.listen(3006);