/**
 * Module dependencies.
 */

var appKey = process.argv[2];
var appSecret = process.argv[3];
if (!appKey || !appSecret) {
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

var http = require('http');

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
    res.writeHead(302);
    res.redirect('https://foursquare.com/oauth2/authenticate?client_id=' + appKey + '&response_type=code&redirect_uri=http://127.0.0.1:3004/auth');
    res.end();
});

function get(host, url, callback) {
    var httpClient = http.createClient(443, host, true);
    var request = httpClient.request('GET', url, {host: host});
    request.end();
    request.on('response', function (response) {
        var data = '';
        response.on('data', function (chunk) {
            data += chunk;
        });
        response.on('end', function() {
            callback(data);
        });
    });
}

app.get('/auth',
function(req, res) {
    console.log("incoming code " + req.param('code'));
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    var url = '/oauth2/access_token' +
      '?client_id=' + appKey + 
      '&client_secret=' + appSecret +
      '&grant_type=authorization_code' +
      '&redirect_uri=http://127.0.0.1:3004/auth' +
      '&code=' + req.param('code');
    console.log('url = ' + url);
    get('foursquare.com', url, function(data) {
        var responseObject = JSON.parse(data);
        console.log('access_token = ' + responseObject.access_token);  
        fs.writeFile("access.token", responseObject.access_token);
        res.end("too legit to quit: " + responseObject.access_token + " so now <a href='/friends'>load friends</a>");
    });
});


app.get('/friends',
function(req, res) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.readFile("access.token", "utf-8", function(err, token) {
            console.log("loaded token " + token);
            if (err)
                res.end("no token you need to <a href='/go4sq'>auth w/ 4sq</a> yet");
            else {
                get('api.foursquare.com', '/v2/users/self/friends.json?oauth_token=' + token, function(data) {
                    res.write(data);
                    res.end();
                });
            }
        });
});

console.log("http://localhost:3004/");
app.listen(3004);
