var cwd = process.argv[3];
var port = process.argv[2];
if (!cwd || !port) {
    process.stderr.write("missing dir and port arguments\n");
    process.exit(1);
}
process.chdir(cwd);


var http = require('http'),
    sys = require('sys');
    express = require('express'),
    connect = require('connect'),
    wwwdude = require('wwwdude'),
    lfs = require('../../Common/node/lfs.js');

var me = lfs.loadMeData();

var app = express.createServer(
    connect.bodyDecoder(),
    connect.cookieDecoder(),
    connect.session({secret : "locker"})
    );
    

var twitterClient = require('twitter-js')(me.consumerKey, me.consumerSecret, me.uri);

Array.prototype.addAll = function(anotherArray) {
    if(!anotherArray || !anotherArray.length)
        return;
    for(var i = 0; i < anotherArray.length; i++)
        this.push(anotherArray[i]);
}


app.get('/friends',
function(req, res) {
    console.log('/friends');
    getUserInfo(function(userInfo) {
        me.user_info = userInfo;
        lfs.syncMeData(me);
        getFriendsIDs(me.user_info.screen_name, function(ids) {
            getUsersExtendedInfo(ids, function(usersInfo) {
                sys.debug('got all ' + usersInfo.length + ' friends');
                lfs.writeObjectsToFile('friends.json', usersInfo);
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
    twitterClient.apiCall('GET', '/account/verify_credentials.json', { token: { oauth_token_secret: me.token.oauth_token_secret,
                                                                                oauth_token: me.token.oauth_token},
                                                                       include_entities : true},
        function(error, result) {
           if(error)
               sys.debug('verify_credentials error: ' + sys.inspect(error));
           else {
               console.log('getUserInfo callback, coming right up');
               callback(result);
           }
        });
}

function getFriendsIDs(screenName, callback) {
    wwwdude.createClient().get('http://api.twitter.com/1/friends/ids.json?screen_name=' + me.user_info.screen_name + '&cursor=-1')
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
                console.log('error! ' + JSON.stringify(error));
                return;
            }
            userInfo.addAll(result.reverse());
            if(userIDs.length > 0) 
                _getUsersExtendedInfo(userIDs, userInfo, callback);
            else if(callback)
                callback(userInfo);
        });
}

console.log('http://localhost:' + port + '/');
app.listen(port);
