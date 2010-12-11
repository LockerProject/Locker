/**
 * Module dependencies.
 */

var appID = process.argv[2];
var appSecret = process.argv[3];
if (!appID || !appSecret)
 {
    console.log("node client.js appid appsecret");
    console.log("create one at http://www.facebook.com/developers/createapp.php");
    process.exit(1);
}

var fs = require('fs'),
http = require('http');
var express = require('express'),
connect = require('connect'),
facebookClient = require('facebook-js')(
appID,
appSecret
),
app = express.createServer(
connect.bodyDecoder(),
connect.cookieDecoder(),
connect.session()
);


var wwwdude = require('wwwdude'),
sys = require('sys');
var wwwdude_client = wwwdude.createClient({
    encoding: 'binary'
});

app.set('views', __dirname);

app.get('/',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    fs.readFile("access.token",
    function(err, data) {
        if (err)
        res.end("you need to <a href='/gofb'>auth w/ fb</a> yet");
        else
        res.end("found a token, <a href='/friends'>load friends</a>");
    });
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
    {
        redirect_uri: 'http://localhost:3003/auth'
    },
    function(error, access_token, refresh_token) {
        if (error) {
            console.log(error);
            res.end("uhoh " + error);

        } else {
            console.log("a " + access_token + " r " + refresh_token)
            res.end("too legit to quit: " + access_token + " so now <a href='/friends'>load friends</a>");
            fs.writeFile("access.token", access_token);
        }
    }
    );
    //  facebookClient.getAccessToken({redirect_uri: 'http://localhost:3003/auth', code: req.param('code')}, function (error, token) {
    //	console.log("got token "+token);
    //	res.end("got token "+token);
    //    });
});


var photoQueue = [];
var photoIndex = 0;
function downloadPhotos(userID) {
    fs.mkdir('my/' + userID + '/photos/', 0755);
    downloadNextPhoto();
}
function downloadNextPhoto() {
    if (photoIndex >= photoQueue.length) return;

    var userID = photoQueue[photoIndex].userID;
    var friendID = photoQueue[photoIndex].friendID;
    photoIndex++;
    try {
        // console.log('http://graph.facebook.com/' + id + '/picture');
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
                fs.writeFileSync('my/' + userID + '/photos/' + friendID + '.jpg', data, 'binary');
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
    {
        'host': 'api.facebook.com'
    });
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
    fs.readFile("access.token", "utf-8",
    function(err, token) {
        console.log("loaded token " + JSON.stringify(token));
        if (err)
        res.end("you need to <a href='/gofb'>auth w/ fb</a> yet");
        else {
            facebookClient.apiCall('GET', '/me', {
                access_token: token
            },
            function(error, result) {
                res.write('for user ' + result.name + ' with id ' + result.id + ': \n\n');
                var userID = result.id;
                fs.mkdir('my/' + userID, 0755);

                facebookClient.apiCall(
                'GET',
                '/me/friends',
                {
                    access_token: token
                },
                function(error, result) {
                    console.log(error);
                    //console.log(result);
                    res.end("got result " + JSON.stringify(result));
                    fs.mkdir('my/' + userID, 0755);
                    var stream = fs.createWriteStream('my/' + userID + '/contacts.json');
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
                {
                    access_token: token
                },
                function(error, result) {
                    console.log(error);
                    //console.log(result);
                    var stream = fs.createWriteStream('my/' + userID + '/places.json');
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
});

console.log("http://localhost:3003/");
app.listen(3003);
