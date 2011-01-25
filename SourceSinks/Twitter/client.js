var consumerKey = process.argv[2];
var consumerSecret = process.argv[3];


var oauth_token_secret,
oauth_token;

if (!consumerKey || !consumerSecret)
 {
    console.log("node client.js consumerKey consumerSecret");
    console.log("create one at http://dev.twitter.com/apps/new");
    process.exit(1);
}
var express = require('express'),
connect = require('connect');

var twitterClient = require('twitter-js')(consumerKey, consumerSecret, 'http://127.0.0.1:3003/'),
app = express.createServer(
connect.bodyDecoder(),
connect.cookieDecoder(),
connect.session()
);

app.get('/',
function(req, res) {
    twitterClient.getAccessToken(req, res,
    function(error, token) {
        if (error)
            console.log(JSON.stringify(error));
        res.writeHead(200, {
            'Content-Type': 'text/html'
        });
        if (token != null) {
            console.log(JSON.stringify(token));
            oauth_token = token.oauth_token;
            oauth_token_secret = token.oauth_token_secret;
        }
        res.end();
        //    res.render('client.jade', {locals: {token: token}});
    });
});

    

app.post('/message',
function(req, res) {
    twitterClient.apiCall('POST', '/statuses/update.json',
    {
        token: {
            oauth_token_secret: req.param('oauth_token_secret'),
            oauth_token: req.param('oauth_token'),
            status: req.param('message')
        }
    },
    function(error, result) {
        res.render('done.jade');
    }
    );
});

app.listen(3003);