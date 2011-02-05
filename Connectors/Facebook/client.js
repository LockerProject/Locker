/**
 * web server/service to wrap interactions w/ FB open graph
 */

var cwd = process.argv[2];
var port = process.argv[3];
if (!cwd || !port)
{
    process.stderr.write("missing dir and port arguments\n");
    process.exit(1);
}
process.chdir(cwd);

var fs = require('fs'),
    http = require('http'),
    express = require('express'),
    connect = require('connect'),
    app = express.createServer(
                    connect.bodyDecoder(),
                    connect.cookieDecoder(),
                    connect.session({secret : "locker"})),
    lfs = require('../../Common/node/lfs.js');

var wwwdude = require('wwwdude'),
sys = require('sys');
var wwwdude_client = wwwdude.createClient({
    encoding: 'binary'
});

var me = lfs.loadMeData();
var facebookClient = require('facebook-js')();
//var facebookClient = require('facebook-js')(context.appID, context.appSecret);


app.set('views', __dirname);
app.get('/',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    if(!me.token)
        res.end("you need to <a href='/gofb'>auth w/ fb</a> yet");
    else
        res.end("found a token, <a href='/friends'>load friends</a>");
});

app.get('/gofb',
function(req, res) {
    res.redirect(facebookClient.getAuthorizeUrl({
        client_id: appID,
        redirect_uri: 'http://localhost:3003/auth',
        scope: 'offline_access,read_stream'
    }));
});

app.get('/auth',
function(req, res) {
    console.log("incoming auth " + req.param('code'));
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    var OAuth = require("oauth").OAuth2;
    var oa = new OAuth(appID, appSecret, 'https://graph.facebook.com');

    oa.getOAuthAccessToken(
    req.param('code'),
    {redirect_uri: 'http://localhost:' + port + '/auth'},
    function(error, access_token, refresh_token) {
        if (error) {
            console.log(error);
            res.end("uhoh " + error);

        } else {
            console.log("a " + access_token + " r " + refresh_token)
            res.end("too legit to quit: " + access_token + " so now <a href='/friends'>load friends</a>");
            me.token = access_token;
            syncMeData(me);
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

    var userID = photoQueue[photoIndex].userID;
    var friendID = photoQueue[photoIndex].friendID;
    photoIndex++;
    try {
        wwwdude_client.get('https://graph.facebook.com/' + friendID + '/picture')
        .addListener('error',
        function(err) {
            sys.puts('Network Error: ' + sys.inspect(err));
            downloadNextPhoto();
        })
        .addListener('http-error',
        function(data, resp) {
            sys.puts('HTTP Error for: ' + resp.host + ' code: ' + resp.statusCode);
            downloadNextPhoto();
        })
        .addListener('redirect',
        function(data, resp) {
            //   sys.puts('Redirecting to: ' + resp.headers['location']);
            //  sys.puts('Headers: ' + sys.inspect(resp.headers));
            })
        .addListener('success',
        function(data, resp) {
            try {
                fs.writeFileSync('photos/' + friendID + '.jpg', data, 'binary');
                downloadNextPhoto();
            } catch(err) {
                //                  console.lo
                }
        }).send();
    } catch(err) {
    }
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

app.get('/friends',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    console.log("loaded token " + me.token);
    if (!me.token)
        res.end("you need to <a href='/gofb'>auth w/ fb</a> yet");
    else {
        facebookClient.apiCall('GET', '/me', {access_token: me.token},
        function(error, result) {
            res.write('for user ' + result.name + ' with id ' + result.id + ': \n\n');
            var userID = result.id;
            facebookClient.apiCall(
            'GET',
            '/me/friends',
            {access_token: me.token},
            function(error, result) {
                console.log(error);
                res.end("got result " + JSON.stringify(result));
                var stream = fs.createWriteStream('contacts.json');
                for (var i = 0; i < result.data.length; i++) {
                    if (result.data[i]) {
                        stream.write(JSON.stringify(result.data[i]) + "\n");
                        // console.log(JSON.stringify(result.data[i]));
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
            });

            facebookClient.apiCall(
            'GET',
            '/me/checkins',
            {access_token: me.token},
            function(error, result) {
                console.log(error);
                //console.log(result);
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
        res.end();
    });
});


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
    if(!meta.feed)
        meta.feed = {};
    var items = [];
    pullNewsFeedPage(null, meta.feed.latest, items, function() {
        items.reverse();
        lfs.appendObjectsToFile('feed.json', items);
        callback();
    });
}

function pullNewsFeedPage(until, since, items, callback) {
    var params = {access_token: me.token, limit: 1000};
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
                if(!meta.feed.latest || t > meta.feed.latest)
                    meta.feed.latest = t;
                console.log(JSON.stringify(meta));
                for(var i = 0; i < result.data.length; i++)
                    items.push(result.data[i]);
                var next = result.paging.next;
                var until = unescape(next.substring(next.lastIndexOf("&until=") + 7));
                pullNewsFeedPage(until, since, items, callback);
            } else if(callback) {
                lfs.writeMetadata(meta);
                callback();
            }
        });
}


app.listen(port);
console.log("http://localhost:" + port + '/');
