/*var cwd = process.argv[2];
var port = process.argv[3];
//console.log
if (!cwd || !port) {
    process.stderr.write("missing dir and port arguments\n");
    process.exit(1);
}*/

var express = require('express'),
    connect = require('connect'),
    fs = require('fs'),
    http = require('http'),
    url = require('url'),
    sys = require('sys'),
    wwwdude = require('wwwdude'),
    locker = require('../../Common/node/locker.js'),
    lfs = require('../../Common/node/lfs.js');


var requestCount;
var twitterClient;

var app = express.createServer(
        connect.bodyDecoder(),
        connect.cookieDecoder(),
        connect.session({secret : "locker"})
    );
    

var me, auth, latests, userInfo;

Array.prototype.addAll = function(anotherArray) {
    if(!anotherArray || !anotherArray.length)
        return;
    for(var i = 0; i < anotherArray.length; i++)
        this.push(anotherArray[i]);
}

app.get('/', function(req, res) {
    if(!(auth.consumerKey && auth.consumerSecret)) {
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
    } else if(!auth.token) {
        if(!twitterClient) 
            twitterClient = require('twitter-js')(auth.consumerKey, auth.consumerSecret, me.uri);

        twitterClient.getAccessToken(req, res,
            function(error, newToken) {
                if (error)
                    sys.debug(JSON.stringify(error));
                if (newToken != null) {  
                    res.writeHead(200, {
                        'Content-Type': 'text/html'
                    });
                    auth.token = newToken;
                    lfs.writeObjectToFile('auth.json', auth);
                    res.end("<html>great! now you can:<br><li><a href='home_timeline'>sync your timeline</a></li>" + 
                                                         "<li><a href='mentions'>sync your mentions</a></li>" + 
                                                         "<li><a href='friends'>sync your friends</a></li>" + 
                                                          "<li><a href='followers'>sync your followers</a></li>" +
                                                         "<li><a href='profile'>sync your profile</a></li>" +"</html>");
                }
            });    
    } else {
        if(!twitterClient)
            twitterClient = require('twitter-js')(auth.consumerKey, auth.consumerSecret, me.uri);   

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end("<html>great! now you can:<br><li><a href='home_timeline'>sync your timeline</a></li>" + 
                                             "<li><a href='mentions'>sync your mentions</a></li>" + 
                                             "<li><a href='friends'>sync your friends</a></li>" + 
                                              "<li><a href='followers'>sync your followers</a></li>" +
                                             "<li><a href='profile'>sync your profile</a></li>" +"</html>");
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
    auth.consumerKey = req.param('consumerKey');
    auth.consumerSecret = req.param('consumerSecret');

    lfs.writeObjectToFile('auth.json', auth);
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
    pullStatuses('home_timeline', 60, res);
});


app.get('/mentions', function(req, res) {
    pullStatuses('mentions', 120, res);
});

app.get('/rate_limit_status', function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    getRateLimitStatus(function(status) {
        res.write(JSON.stringify(status));
        res.end();
    });
});

function pullStatuses(endpoint, repeatAfter, res) {
    if(!getTwitterClient()) {
        sys.debug('could not get twitterClient, redirecting...');
        res.redirect('./');
        return;
    }
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    pullTimeline(endpoint, function() {
        locker.at(me.uri + endpoint, repeatAfter);
        res.end();
    });
    
}

function pullTimeline(endpoint, callback) {
    if(!latests[endpoint])
        latests[endpoint] = {};
    var items = [];
    pullTimelinePage(endpoint, null, latests[endpoint].latest, null, items, function() {
        items.reverse();
        lfs.appendObjectsToFile(endpoint + '.json', items);
        callback();
    });
}

function pullTimelinePage(endpoint, max_id, since_id, page, items, callback) {
    if(!page)
        page = 1;
    var params = {token: auth.token, count: 200, page: page, include_entities:true};
    if(max_id)
        params.max_id = max_id;
    if(since_id)
        params.since_id = since_id;
    requestCount++;
    twitterClient.apiCall('GET', '/statuses/' + endpoint + '.json', params, 
        function(error, result) {
            if(error) {
                if(error.statusCode == 502 || error.statusCode == 503) { //failz-whalez, hang out for a bit
                    setTimeout(function(){pullTimelinePage(endpoint, max_id, since_id, page, items, callback);}, 10000);
                }
                sys.debug('error from twitter:' + sys.inspect(error));
                return;
            }
            if(result.length > 0) {
                var id = result[0].id;
                if(!latests[endpoint].latest || id > latests[endpoint].latest)
                    latests[endpoint].latest = id;
                for(var i = 0; i < result.length; i++)
                    items.push(result[i]);

                if(!max_id)
                    max_id = result[0].id;
                page++;
                if(requestCount > 300) {
                    sys.debug('sleeping a bit...');
                    setTimeout(function() {
                        pullTimelinePage(endpoint, max_id, since_id, page, items, callback);
                    }, 30000);
                } else {
                    pullTimelinePage(endpoint, max_id, since_id, page, items, callback);
                }
            } else if(callback) {
                lfs.writeObjectToFile('latests.json', latests);
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
    syncUsersInfo('friends', req, res);
});


app.get('/followers',
function(req, res) {
    syncUsersInfo('followers', req, res);
});

function syncUsersInfo(friendsOrFollowers, req, res) {
    if(!friendsOrFollowers || friendsOrFollowers.toLowerCase() != 'followers')
        friendsOrFollowers = 'friends';
        
    function done() {    
        locker.at(me.uri + friendsOrFollowers, 3600);
        res.writeHead(200);
        res.end();
    }
    getUserInfo(function(newUserInfo) {
        userInfo = newUserInfo;
        lfs.writeObjectToFile('usersInfo.json', userInfo);
        getIDs(friendsOrFollowers, userInfo.screen_name, function(ids) {
            if(!ids || ids.length < 1)
                done();
            else
                getUsersExtendedInfo(ids, function(usersInfo) {
                    sys.debug('got ' + usersInfo.length + ' ' + friendsOrFollowers);
                    lfs.writeObjectsToFile(friendsOrFollowers + '.json', usersInfo);
                    done();
                });
        });
    });
}

app.get('/profile',
function(req, res) {
    getUserInfo(function(newUserInfo) {
        userInfo = newUserInfo;
        lfs.writeObjectToFile('userInfo.json', userInfo);
        res.writeHead(200);
        res.end();
    })
});

function getUserInfo(callback) {
    if(!getTwitterClient())
        return;
    twitterClient.apiCall('GET', '/account/verify_credentials.json', { token: { oauth_token_secret: auth.token.oauth_token_secret,
                                                                                oauth_token: auth.token.oauth_token},
                                                                       include_entities : true},
        function(error, result) {
            if(error)
                sys.debug('verify_credentials error: ' + sys.inspect(error));
            else
                callback(result);
        });
}


function getIDs(friendsOrFolowers, screenName, callback) {
    if(!friendsOrFolowers || friendsOrFolowers.toLowerCase() != 'followers')
        friendsOrFolowers = 'friends';
    friendsOrFolowers = friendsOrFolowers.toLowerCase();
    console.log('http://api.twitter.com/1/' + friendsOrFolowers + '/ids.json?screen_name=' + screenName + '&cursor=-1');
    wwwdude.createClient().get('http://api.twitter.com/1/' + friendsOrFolowers + '/ids.json?screen_name=' + screenName + '&cursor=-1')
    .addListener('success', function(data, resp) {
        console.log('getIDs, data: ' + data);
       callback(JSON.parse(data).ids);
    })   
    .addListener('error', function (err) {
        // err: error exception object
        sys.debug('Error: ' + sys.inspect(err));
     })
    .addListener('http-error', function (data, resp) {
        // data = transferred content, resp = repsonse object
        sys.debug('HTTP Status Code > 400');
        sys.debug('Headers: ' + sys.inspect(res.headers));
    })
    .addListener('http-client-error', function (data, resp) {
        // data = transferred content, resp = repsonse object
        sys.debug('HTTP Client Error (400 <= status < 500)');
        sys.debug('Headers: ' + sys.inspect(res.headers));
    })
    .addListener('http-server-error', function (data, resp) {
        // data = transferred content, resp = repsonse object
        sys.debug('HTTP Client Error (status > 500)');
        sys.debug('Headers: ' + sys.inspect(res.headers));
    });
}

function getFriendsIDs(screenName, callback) {
    wwwdude.createClient().get('http://api.twitter.com/1/friends/ids.json?screen_name=' + screenName + '&cursor=-1')
    .addListener('success', function(data, resp) {
       callback(JSON.parse(data).ids);
    })   
    .addListener('error', function (err) {
        // err: error exception object
        sys.debug('Error: ' + sys.inspect(err));
     })
    .addListener('http-error', function (data, resp) {
        // data = transferred content, resp = repsonse object
        sys.debug('HTTP Status Code > 400');
        sys.debug('Headers: ' + sys.inspect(resp.headers));
    })
    .addListener('http-client-error', function (data, resp) {
        // data = transferred content, resp = repsonse object
        sys.debug('HTTP Client Error (400 <= status < 500)');
        sys.debug('Headers: ' + sys.inspect(resp.headers));
    })
    .addListener('http-server-error', function (data, resp) {
        // data = transferred content, resp = repsonse object
        sys.debug('HTTP Client Error (status > 500)');
        sys.debug('Headers: ' + sys.inspect(resp.headers));
    });
}

/** returns object with:
 *  remaining_hits (api call remaining),
 *  hourly_limit (total allowed per hour), 
 *  reset_time (time stamp), 
 *  reset_time_in_seconds (unix time in secs)
 */
function getRateLimitStatus(callback) {
    wwwdude.createClient().get('http://api.twitter.com/1/account/rate_limit_status.json')
    .addListener('success', function(data, resp) {
        var limits = JSON.parse(data);
        var remainingTime = limits.reset_time_in_seconds - (new Date().getTime() / 1000);
        if(limits.remaining_hits)
            limits.sec_between_calls = remainingTime / limits.remaining_hits;
        else
            limits.sec_between_calls = remainingTime / 1;
        callback(limits);
    });
}

function getUsersExtendedInfo(userIDs, callback) {
    _getUsersExtendedInfo(userIDs, [], callback);
}

function _getUsersExtendedInfo(userIDs, usersInfo, callback) {
    if(!usersInfo)
        usersInfo = [];
    var id_str = "";
    for(var i = 0; i < 100 && userIDs.length > 0; i++) {
        id_str += userIDs.pop();
        if(i < 99) id_str += ',';
    }
    console.log('user_id:' + id_str);
    twitterClient.apiCall('GET', '/users/lookup.json', { token: { oauth_token_secret: auth.token.oauth_token_secret,
                                                                  oauth_token: auth.token.oauth_token}, 
                                                         user_id: id_str,
                                                         include_entities : true },
        function(error, result) {
            if(error) {
                sys.debug('error! ' + JSON.stringify(error));
                return;
            }
            usersInfo.addAll(result.reverse());
            if(userIDs.length > 0) 
                _getUsersExtendedInfo(userIDs, usersInfo, callback);
            else if(callback) {
                getPhotos(usersInfo);
                callback(usersInfo);
            }
        });
}

function getPhotos(users) {
    try {
        fs.mkdirSync('photos', 0755);
    } catch(err) {
    }
    for(var i = 0; i < users.length; i++) {
        var user = users[i];
        var photoExt = user.profile_image_url.substring(user.profile_image_url.lastIndexOf('.'));
        lfs.writeContentsOfURLToFile(user.profile_image_url, 'photos/' + user.id_str + photoExt, 3, 'binary');
    }
}

function getTwitterClient() {
    if(!twitterClient && auth && auth.consumerKey && auth.consumerSecret && me && me.uri)
        twitterClient = require('twitter-js')(auth.consumerKey, auth.consumerSecret, me.uri);
    return twitterClient;
}

function clearCount() {
    requestCount = 0;
    setTimeout(clearCount, 3600000);
}
clearCount();

var stdin = process.openStdin();
stdin.setEncoding('utf8');
stdin.on('data', function (chunk) {
    var processInfo = JSON.parse(chunk);
    process.chdir(processInfo.workingDirectory);
    lfs.readObjectFromFile('auth.json', function(newAuth) {
        auth = newAuth;
        lfs.readObjectFromFile('latests.json', function(newLatests) {
            latests = newLatests;
            lfs.readObjectFromFile('userInfo.json', function(newUserInfo) {
                userInfo = newUserInfo;
                me = lfs.loadMeData();
                app.listen(processInfo.port);
                var returnedInfo = {port: processInfo.port};
                console.log(JSON.stringify(returnedInfo));
            });
        });
    });
});
