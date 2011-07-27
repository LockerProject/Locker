/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

/**
 * Module dependencies.
 */
var fs = require('fs');
var express = require('express'),
    connect = require('connect'),
    app = express.createServer(
        connect.bodyParser(),
        connect.cookieParser(),
        connect.session({secret : 'locker'})
    ),
    request = require('request'),
    oauthclient = require('oauth').OAuth,
    locker = require('locker'),
    lfs = require('lfs'),
    sys = require('sys'),
    xml2js = require('xml2js'),
    eyes = require('eyes'),
    lconfig = require('lconfig');

var lockerInfo;
var accessData;
var externalUrl;
var oAuth;
var state;
var CALLBACK_URL = 'http://'+lconfig.lockerHost+':'+lconfig.lockerPort+'/Me/goodreads/callback';


function setupOAuthClient(clientId, clientSecret) 
{
    oAuth = new oauthclient('http://www.goodreads.com/oauth/request_token',
                            'http://www.goodreads.com/oauth/access_token',
                            clientId, clientSecret, 
                            '1.0',
                            CALLBACK_URL,
                            'HMAC-SHA1');
}

app.get('/',
function(req, res) 
{
    res.writeHead(200, {'Content-Type': 'text/html'});
    if (!accessData.accessToken) 
	{
        res.end('<html>you need to <a href="oauthrequest">auth w/ GoodReads</a> still</html>');
    } 
	else 
	{
		res.end('<html>found a token, load <a href="books">books</a></html>');
    }
});

app.get('/oauthrequest',
function(req, res) 
{
	if (!(accessData.clientId && accessData.clientSecret)) 
	{
		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.end('<html>Enter your personal GoodReads app info that will be used to sync your data' + 
				' (create a new one <a href="http://www.goodreads.com/api/keys">' + 
				'here</a> using the callback url of ' +
				externalUrl+'auth) ' +
				'<form method="get" action="save">' +
					'Client ID: <input name="clientId"><br>' +
					'Client Secret: <input name="clientSecret"><br>' +
					'<input type="submit" value="Save">' +
				'</form></html>');
	} 
	else 
	{
		var params = { response_type: 'code', redirect_uri: externalUrl + 'auth' };
		setupOAuthClient(accessData.clientId, accessData.clientSecret);                        
		oAuth.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results)
		{
			if (error)
			{
				console.log(error);
				res.send("yeah no. didn't work.")
			}
			else 
			{
				req.session.oauth = {};
				req.session.oauth.token = oauth_token;
				req.session.oauth.token_secret = oauth_token_secret;
				res.redirect('http://www.goodreads.com/oauth/authorize?oauth_token='+oauth_token+'&oauth_callback='+CALLBACK_URL)
			}
		});
	}    
});

app.get('/save',
function(req, res) 
{
    res.writeHead(200, {'Content-Type': 'text/html'});
    if (!req.param('clientId') || !req.param('clientSecret')) 
	{
        res.end('missing field(s)?');
        return;
    }
    accessData.clientId = req.param('clientId');
    accessData.clientSecret = req.param('clientSecret');
    lfs.writeObjectsToFile('access.json', [accessData]);
    res.end('<html>thanks, now we need to <a href="oauthrequest">auth that app to your account</a>.</html>');
});

app.get('/callback',
function(req, res, next)
{
	if (req.session.oauth)
	{
		req.session.oauth.verifier = req.query.oauth_verifier;
		var oauth = req.session.oauth;
		oAuth.getOAuthAccessToken(oauth.token,oauth.token_secret,oauth.verifier, 
			function(error, oauth_access_token, oauth_access_token_secret, results)
			{
				if (error)
				{
					console.log(error);
					res.send("yeah something broke.");
				}
				else 
				{
					req.session.oauth.access_token = oauth_access_token;
					req.session.oauth,access_token_secret = oauth_access_token_secret;
					console.log(results);
					accessData.accessToken = oauth_access_token;
					accessData.accessTokenSecret = oauth_access_token_secret;
					oAuth.get('http://www.goodreads.com/api/auth_user',accessData.accessToken, accessData.accessTokenSecret,
						function(err, data) 
						{
							if (err) 
							{
								console.error(err);
								return false;
							}
							var parser = new xml2js.Parser();
							parser.on('end', 
								function(result) 
								{
									accessData.userId = result.user["@"].id;
									lfs.writeObjectsToFile('access.json', [accessData]);
									res.redirect('/Me/goodreads/');
								}
							);        
								parser.on('error', 
									function(err) 
									{
										console.error(err);
									}
								);
							parser.parseString(data);
						}
					);
					
				}
			}
		);
	} 
	else
	{
		next(new Error("you're not supposed to be here."))
	}
});

app.get('/books', 
function(req, res) 
{
	oAuth.get('http://www.goodreads.com/review/list/'+accessData.userId+'?format=xml&v=2&key='+accessData.clientId, accessData.accessToken, accessData.accessTokenSecret,
		function(err, data) 
		{
			if (err) 
			{
				console.error(err);
				return false;
			}
			var parser = new xml2js.Parser();
			parser.addListener('end', function(result) {
				var allBooks = [];
				var books = result.reviews.review;
					for(var i = 0; i < books.length; i++) {
                            		console.log(JSON.stringify(books[i]) + '\n');
						allBooks.push(books[i]);
					}
					var stream = fs.createWriteStream('owned_books.json', {'flags': 'a'});
					for(var i = allBooks.length - 1; i >=0 ; i--) {
						stream.write(JSON.stringify(allBooks[i]) + "\n");
					}
				stream.end();
			});
			parser.parseString(data);
			res.end('Books saved to owned_books.json');
		}
	);
});

// Process the startup JSON object
process.stdin.resume();
process.stdin.on('data', function(data) 
{
    lockerInfo = JSON.parse(data);
    if (!lockerInfo || !lockerInfo.workingDirectory) 
	{
        process.stderr.write('Was not passed valid startup information.'+data+'\n');
        process.exit(1);
    }
    externalUrl = lockerInfo.externalBase;
    locker.initClient(lockerInfo);
    process.chdir(lockerInfo.workingDirectory);
    try 
	{
        accessData = JSON.parse(fs.readFileSync('access.json', 'utf8'));
        setupOAuthClient(accessData.clientId, accessData.clientSecret);
    } 
	catch (E) 
	{
        accessData = {};
    }
    lfs.readObjectFromFile('state.json', 
		function(newestState) 
		{
			state = newestState;
		}
	);
    app.listen(lockerInfo.port, 'localhost', 
		function() 
		{
			process.stdout.write(data);
		}
	);
});
