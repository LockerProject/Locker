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
    wwwdude = require('wwwdude'),
    locker = require('../../Common/node/locker.js'),
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

Array.prototype.addAll = function(anotherArray) {
    if(!anotherArray || !anotherArray.length)
        return;
    for(var i = 0; i < anotherArray.length; i++)
        this.push(anotherArray[i]);
}

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
        locker.at(me.uri + 'home_timeline', 20);
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

app.get('/friends',
function(req, res) {
    sys.debug('/friends');
    getUserInfo(function(userInfo) {
        me.user_info = userInfo;
        lfs.syncMeData(me);
        getFriendsIDs(me.user_info.screen_name, function(ids) {
            getUsersExtendedInfo(ids, function(usersInfo) {
                sys.debug('got ' + usersInfo.length + ' friends');
                lfs.writeObjectsToFile('friends.json', usersInfo);
                locker.at(me.uri + 'friends', 3600);
                res.writeHead(200);
                res.end();
            });
        });
    });
});

app.get('/profile',
function(req, res) {
    getUserInfo(function(userInfo) {
        me.user_info = userInfo;
        lfs.syncMeData(me);
        res.writeHead(200);
        res.end();
    })
});

function getUserInfo(callback) {
    if(!getTwitterClient())
        return;
    twitterClient.apiCall('GET', '/account/verify_credentials.json', { token: { oauth_token_secret: me.token.oauth_token_secret,
                                                                                oauth_token: me.token.oauth_token},
                                                                       include_entities : true},
        function(error, result) {
            if(error)
                sys.debug('verify_credentials error: ' + sys.inspect(error));
            else
                callback(result);
        });
}

function getFriendsIDs(screenName, callback) {
    wwwdude.createClient().get('http://api.twitter.com/1/friends/ids.json?screen_name=' + screenName + '&cursor=-1')
    .addListener('success', function(data, resp) {
       callback(JSON.parse(data).ids);
    }).send();
}

function getUsersExtendedInfo(userIDs, callback) {
    _getUsersExtendedInfo(userIDs, [], callback);
}
function _getUsersExtendedInfo(userIDs, userInfo, callback) {
    if(!userInfo)
        userInfo = [];
    var id_str = "";
    for(var i = 0; i < 100 && userIDs.length > 0; i++) {
        id_str += userIDs.pop();
        if(i < 99) id_str += ',';
    }
    twitterClient.apiCall('GET', '/users/lookup.json', { token: { oauth_token_secret: me.token.oauth_token_secret,
                                                                  oauth_token: me.token.oauth_token}, 
                                                         user_id: id_str,
                                                         include_entities : true },
        function(error, result) {
            if(error) {
                sys.debug('error! ' + JSON.stringify(error));
                return;
            }
            userInfo.addAll(result.reverse());
            if(userIDs.length > 0) 
                _getUsersExtendedInfo(userIDs, userInfo, callback);
            else if(callback)
                callback(userInfo);
        });
}

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