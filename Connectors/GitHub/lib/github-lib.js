var request = require('request');
var querystring = require('querystring');

var _debug = true;
var urlBase = 'https://github.com/api/v2/json';
var token;

exports.setToken = function(newToken) {
    token = newToken;
}

exports.getNewWatchers = function(username, repoName, knownIDs, callback) {
    exports.getWatchers(username, repoName, function(err, watchers) {
        if(!err) {
            var newWatchers = [];
            watchers.forEach(function(watcher) {
                if(!knownIDs[watcher.login])
                    newWatchers.push(watcher);
            });
            getUsersInfo(newWatchers, callback);
        }
    });
}

exports.getWatchers = function(username, reponame, callback) {
    get('/repos/show/' + username + '/' + reponame + '/watchers', {full:1}, function(err, data) {
        if(err || !data || !data.watchers)
            callback(err || new Error(), data);
        else
            callback(null, data.watchers);
    });
}

exports.getUserInfo = function(username, callback) {
    get('/user/show/' + username , null, function(err, data) {
        if(!data || !data.user)
            callback(err, data);
        else
            callback(err, data.user);
    });
}

exports.getRepositories = function(username, callback) {
    get('/repos/show/' + username, null, function(err, data) {
        if(!data || !data.repositories)
            callback(err, data);
        else
            callback(err, data.repositories);
    })
}

//var callsThisMinute = 0;
var rateLimited = false;
function get(endpoint, params, callback) {
    var url = urlBase + endpoint;
    if(!params)
        params = {};
    if(token)
        params.token = token;
    url += '?' + querystring.stringify(params);
    if(_debug) console.log('github getting', url);
    request.get({uri:url}, function(err, resp, body) {
        if(_debug) console.log(resp.statusCode);
        if(_debug) console.log(resp.headers);
        if(err)
            callback(err);
        else if(resp.statusCode == 403 && resp.headers['x-ratelimit-remaining'] == '0') {
            setTimeout(function() {
                get(endpoint, params, callback)
            }, 10000);
        }
        else if(!body)
            callback(err, resp);
        else // !err && body
            callback(err, JSON.parse(body));
    });
}


var interval = 1001;
//var interval = 1;
function getUsersInfo(users, arr, callback) {
    var d = new Date().getTime();
    if(!callback && typeof arr == 'function') {
        callback = arr;
        arr = [];
    }
    if(!users || users.length < 1) { // || arr.length > 50) {
        callback(arr);
        return;
    }
    var user = users[0];
    console.log('getting', user.login);
    exports.getUserInfo(user.login, function(err, userInfo) {
        var sleep = 10000;
        if(!userInfo || !userInfo.login) //probably rate limited
            console.error('no login:', userInfo);
        if(!err) {
            users.shift();
            arr.push(userInfo);
            sleep = interval - (new Date().getTime() - d);
        } else {
            console.error(err);
        }
        if(sleep < 1)
            sleep = 1;
        setTimeout(function() {
            getUsersInfo(users, arr, callback);
        }, sleep);
    })
}