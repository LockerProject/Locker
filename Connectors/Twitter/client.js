var cwd = process.argv[2];
var port = process.argv[3];
if (!cwd || !port) {
    process.stderr.write("missing dir and port arguments\n");
    process.exit(1);
}
process.chdir(cwd);

var express = require('express'),
    connect = require('connect'),
    fs = require('fs'),
    http = require('http'),
    url = require('url'),
    sys = require('sys'),
    lfs = require('../../Common/node/lfs.js');

var me = lfs.loadMeData();

var requestCount;
var twitterClient;// = require('twitter-js')();

var app = express.createServer(
        connect.bodyDecoder(),
        connect.cookieDecoder(),
        connect.session({secret : "locker"})
    );
    
var me = lfs.loadMeData();


app.get('/', function(req, res) {
    if(!(me.consumerKey && me.consumerSecret)) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end("<html>Enter your personal Twitter app info that will be used to sync your data" + 
                " (create a new one <a href='http://dev.twitter.com/apps/new'>" + 
                "here</a> using the callback url of " +
                "http://"+url.parse(me.uri).host+"/) " +
                "<form method='get' action='save'>" +
                    "Consumer Key: <input name='consumerKey'><br>" +
                    "Consumer Secret: <input name='consumerSecret'><br>" +
                    "<input type='submit' value='Save'>" +
                "</form></html>");
        return;
    } else if(!me.token) {
        if(!twitterClient) 
            twitterClient = require('twitter-js')(me.consumerKey, me.consumerSecret, me.uri);   

        twitterClient.getAccessToken(req, res,
            function(error, newToken) {
                if (error)
                    sys.debug(JSON.stringify(error));
                if (newToken != null) {  
                    res.writeHead(200, {
                        'Content-Type': 'text/html'
                    });
                    me.token = newToken;
                    lfs.syncMeData(me);
                    res.end("<html>great! now you can <a href='home_timeline'> download your timeline</a></html>");
                }
            });    
    } else {
        if(!twitterClient) {
            twitterClient = require('twitter-js')(me.consumerKey, me.consumerSecret, me.uri);   
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end("<html>great! now you can <a href='home_timeline'> download your timeline</a></html>");
    }
});


app.get('/save',
function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    if(!req.param('consumerKey') || !req.param('consumerSecret')) {
        res.end("missing field(s)?");
        return;
    }
    me.consumerKey = req.param('consumerKey');
    me.consumerSecret = req.param('consumerSecret');

    lfs.syncMeData(me);
    res.end("<html>thanks, now we need to <a href='./'>auth that app to your account</a>.</html>");
});

app.get('/get_home_timeline', function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/javascript'
    });
    lfs.readObjectsFromFile('feed.json', function(data) {
        data.reverse();
        res.write(JSON.stringify(data));
        res.end();
    });
});

app.get('/home_timeline', function(req, res) {
    if(!getTwitterClient()) {
        sys.debug('could not get twitterClient, redirecting...');
        res.redirect('./');
        return;
    }
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    pullTimeline(function() {
        res.end();
    });
});


function pullTimeline(callback) {
    if(!me.home_timeline)
        me.home_timeline = {};
    var items = [];
    pullTimelinePage(null, me.home_timeline.latest, null, items, function() {
        items.reverse();
        lfs.appendObjectsToFile('feed.json', items);
        callback();
    });
}

function pullTimelinePage(max_id, since_id, page, items, callback) {
    if(!page)
        page = 1;
    var params = {token: me.token, count: 200, page: page};
    if(max_id)
        params.max_id = max_id;
    if(since_id)
        params.since_id = since_id;
    requestCount++;
    twitterClient.apiCall('GET', '/statuses/home_timeline.json', params, 
        function(error, result) {
            if(error) {
                sys.debug('error from twitter:' + sys.inspect(error));
                return;
            }
            if(result.length > 0) {
                var id = result[0].id;
                if(!me.home_timeline.latest || id > me.home_timeline.latest)
                    me.home_timeline.latest = id;
                    sys.debug(JSON.stringify(me));
                for(var i = 0; i < result.length; i++)
                    items.push(result[i]);

                if(!max_id)
                    max_id = result[0].id;
                page++;
                if(requestCount > 300) {
                    sys.debug('sleeping a bit...');
                    setTimeout(function() {
                        pullTimelinePage(max_id, since_id, page, items, callback);
                    }, 30000);
                } else {
                    pullTimelinePage(max_id, since_id, page, items, callback);
                }
            } else if(callback) {
                lfs.syncMeData(me);
                callback();
            }
        });
}

    
/*
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
        console.log(JSON.stringify(error));
        console.log(JSON.stringify(result));
    }
    );
});*/

function getTwitterClient() {
    if(!twitterClient && me && me.consumerKey && me.consumerSecret && me.uri)
        twitterClient = require('twitter-js')(me.consumerKey, me.consumerSecret, me.uri);
    return twitterClient;
}

function clearCount() {
    requestCount = 0;
    setTimeout(clearCount, 3600000);
}
clearCount();

console.log('http://localhost:' + port + '/');
app.listen(port);