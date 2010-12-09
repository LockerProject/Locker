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

var fs = require('fs');
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
        else
            facebookClient.apiCall(
                'GET',
                '/me/friends',
                {access_token: token},
                function(error, result) {
                    console.log(error);
                    console.log(result);
                    res.end("got result " + JSON.stringify(result));
                    var stream = fs.createWriteStream("my/contacts.json");
                    for (var i = 0; i < result.data.length; i++) {
                        stream.write(JSON.stringify(result.data[i]) + "\n");
                        console.log('http://graph.facebook.com/' + result.data[i].id + '/picture');
                    }
                    stream.end();
                });
    });

});

console.log("http://localhost:3003/");
app.listen(3003);
