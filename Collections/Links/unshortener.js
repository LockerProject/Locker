
var urllib = require('url');
var http = require('http'), https = require('https');
var querystring = require('querystring');

exports.expand = function (url, options, callback) {
    callback = arguments[arguments.length-1];
    if (typeof(callback) != 'function') {
        callback = function () {};
    }
    options = (typeof(arguments[1]) !== 'function') ? arguments[1] : {};

    url = (typeof(url) === 'object') ? url : urllib.parse(url);
    if(!url) return callback(); // duh

    mapping(url, options)(callback);
};

var mapping = function (url, options) {
    var map = {
        isgd: ['is.gd'],
        googl: ['goo.gl'],
        budurl: ['budurl.com'],
        cligs: ['cli.gs'],
        snipurl: ['snipurl.com', 'snurl.com', 'snurl.com', 'cl.lk', 'snipr.com', 'sn.im']
    };

    for (var k in map) {
        if (map[k].indexOf(url.host) > -1) {
            return function (callback) {
                Unshorteners[k](url, options[k], callback);
            };
        }
    }

    return function (callback) {
        Unshorteners.generic(url, callback);
    };
};

var Unshorteners = {

    isgd: function (url, callback) {
        callback = arguments[arguments.length-1];

        var query = '/forward.php?'+
                querystring.stringify({format: 'json',
                                       shorturl: url.pathname.replace('/', '')});

        Unshorteners.__request(query, 'is.gd', http,
                               function (data) {
                                   if (data.url) {
                                       callback(urllib.parse(data.url));
                                   }else{
                                       Unshorteners.generic(url, callback);
                                   }
                               });
    },

    googl: function (url, callback) {
        callback = arguments[arguments.length-1];

        var query = '/urlshortener/v1/url?'+querystring.stringify({shortUrl: url.href});

        Unshorteners.__request(query, 'www.googleapis.com', https,
                               function (data) {
                                   if (data.longUrl) {
                                       callback(urllib.parse(data.longUrl));
                                   }else{
                                       Unshorteners.generic(url, callback);
                                   }
                               });

    },

    budurl: function (url, callback) {
        callback = arguments[arguments.length-1];

        var query = '/api/v1/budurls/expand?'+querystring.stringify({budurl: url.pathname.replace('/', '')});

        Unshorteners.__request(query, 'budurl.com', http,
                               function (data) {
                                   callback(urllib.parse(data.long_url));
                               });
    },

    cligs: function (url, callback) {
        callback = arguments[arguments.length-1];

        var query = '/api/v1/cligs/expand?'+querystring.stringify({clig: url.pathname.replace('/', '')});

        Unshorteners.__request(query, 'cli.gs', http,
                               function (data) {
                                   callback(urllib.parse(data));
                               });
    },

    snipurl: function (url, callback) {
        callback = arguments[arguments.length-1];

        var query = '/resolveurl?'+querystring.stringify({id: url.pathname.replace('/', '')});

        Unshorteners.__request(query, 'snipurl.com', http,
                               function (data) {
                                   callback(urllib.parse(data));
                               });
    },

    __request: function (query, host, module, callback) {
        var req = module.get({host: host,
                              path: query},
                             function (res) {
                                 var data = '';
                                 res.on('data', function (chunk) {
                                     data += chunk;
                                 });
                                 var finish = function () {
                                     try {
                                         callback(JSON.parse(data));
                                     }catch (e) {
                                         if (e.type == "unexpected_token") {
                                             callback(data);
                                         }else{
                                             throw(e);
                                         }
                                     }
                                 };
                                 res.on('end', finish);
                                 res.on('close', finish);
                             }).on('error', function (e) {
                                 callback(url, true);
                             });
        if(req && req.connection) req.connection.setTimeout(5000);
    },

    generic: function (url, callback) {

        // in general short url's don't have a bunch of parameters
        if (url.query == '') {
            callback(url, false);
            return;
        }

        var req;
        var path = url.pathname;
        if(url.query) path += url.query; // when going through redirects, need to use querystring
        var headers = (url.host === "t.co")?{}:{'User-Agent': 'AppleWebKit/525.13 (KHTML, like Gecko) Safari/525.13.'}; // t.co returns meta refresh if browser!
        var options = {host: url.host,
                       path: path,
                       headers: headers,
                       method: 'HEAD'};

        var handle = function (res) {
            if (res.statusCode === 301 || res.statusCode === 302) {
                exports.expand(urllib.format(urllib.resolve(url,urllib.parse(res.headers.location))), callback);
            }else if (res.statusCode === 200){
                callback(url);
            }else{
                callback(url, true);
            }
        };

        req = (url.protocol === 'http:') ? http.request(options, handle)
            : https.request(options, handle);
        req.end();
        req.on('error', function (e) {
            callback(url, true);
        });
    }

};

exports.Unshorteners = Unshorteners;
