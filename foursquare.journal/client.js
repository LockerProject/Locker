/**
 * Module dependencies.
 */

var appKey = process.argv[2];
var appSecret = process.argv[3];
if (!appKey || !appSecret)
 {
    console.log("node client.js appkey appsecret");
    console.log("create one at https://foursquare.com/oauth/");
    process.exit(1);
}

var fs = require('fs');
var express = require('express'),
    connect = require('connect'),
    app = express.createServer(
        connect.bodyDecoder(),
        connect.cookieDecoder(),
        connect.session()
        );

var OAuth= require("oauth").OAuth;
// Construct the internal OAuth client
var oa= new OAuth("http://foursquare.com/oauth/request_token",
	                         "http://foursquare.com/oauth/access_token", 
	                         appKey,  appSecret, 
	                         "1.0", "http://localhost:3004/auth", "HMAC-SHA1");

app.set('views', __dirname);

app.get('/',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    fs.readFile("access.token",
    function(err, data) {
        if (err)
        res.end("you need to <a href='/go4sq'>auth w/ foursquare</a> yet");
        else
        res.end("found a token, <a href='/friends'>load friends</a>");
    });
});

var oaTokenSecret = "";
app.get('/go4sq',
function(req, res) {
    oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, oauth_authorize_url, additionalParameters ) {
        if (error) {
	        res.writeHead(500);
	        res.end(error);
        } else {
            console.log(oauth_token);
            console.log(oauth_token_secret);
            console.log(oauth_authorize_url);
            console.log(additionalParameters);
            oaTokenSecret=oauth_token_secret;
            res.redirect("http://foursquare.com/oauth/authorize?oauth_token=" + oauth_token);
        }
    });
});

app.get('/auth',
function(req, res) {
    console.log("incoming auth " + req.param('oauth_token'));
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    oa.getOAuthAccessToken(
        req.param('oauth_token'),
        oaTokenSecret,
        req.param('oauth_verifier'),
      function (error, token, secret, additionalParameters) {
        if (error) {
            console.log(error);
            res.end("uhoh " + error);
        } else {
            console.log("t " + token + " s " + secret + " a " + JSON.stringify(additionalParameters));
            res.end("too legit to quit: " + token + " " + secret + " so now <a href='/friends'>load friends</a>");
            fs.writeFile("access.token", token);
            fs.writeFile("access.secret", secret);
        }
      }
    );
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
            res.end("no token you need to <a href='/gofb'>auth w/ fb</a> yet");
        else
            fs.readFile("access.secret", "utf-8", function(err, secret){
                console.log("loaded secret " + JSON.stringify(secret));
                if (err)
                    res.end("no secret you need to <a href='/gofb'>auth w/ fb</a> yet");
                else{
                    console.log(oa.signUrl('https://api.foursquare.com/v2/users/72937.json', token, secret));
                    oa.getProtectedResource('https://api.foursquare.com/v2/users/self/friends.json', "GET", token, secret, function(error, data, response){
                        if(error)
                            res.end("failed? "+ JSON.stringify(error));
                        else{
                            res.end("got result " + JSON.stringify(data));                            
                        }
                    });
                }
                    
            });
/*            facebookClient.apiCall(
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
*/
    });

});

console.log("http://localhost:3004/");
app.listen(3004);
