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
    // serve index page
    // load up existing facebook accounts?
    res.end("go create an app id and secret from facebook at <a href='http://www.facebook.com/developers/createapp.php'>http://www.facebook.com/developers/createapp.php</a> and then enter them");
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
            res.end("too legit to quit: " + access_token);
            fs.writeFile("access.token", access_token);
        }
    }
    );
});


console.log("http://localhost:3003/");
app.listen(3003);
