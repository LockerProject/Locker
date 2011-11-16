// inspired by unshortener.js
var urllib = require('url');
var request = require('request');
var querystring = require('querystring');

var map = {
    isgd: ['is.gd'],
    googl: ['goo.gl'],
    budurl: ['budurl.com'],
    snipurl: ['snipurl.com', 'snurl.com', 'snurl.com', 'cl.lk', 'snipr.com', 'sn.im']
};

var timeout = 5000;

exports.expand = function (args, callback) {
    if(!args || !args.url || typeof(args.url) != 'string') return callback(args);

    // set up defaults
    if(!args.depth) args.depth = 0;
    if(!args.seen) args.seen = {};

    // if we've recursed too far, bail
    if(args.depth > 5) return callback(args);

    // if we've seen this url already, loop bail!
    if(args.seen[args.url]) return callback(args);
    args.seen[args.url] = true;

    // does it parse?
    args.urlp = urllib.parse(args.url);
    if(!args.urlp) return callback(args);

    // only process http stuff, are there any https shorteners?
    if(args.urlp.protocol != 'http:') return callback(args);

    // ok, now process a url!
    args.depth++;

    try {
        // do we have a custom api call for it?
        for (var k in map) {
            if (map[k].indexOf(args.urlp.host) > -1) return APIs[k](args, callback);
        }

        // none, fall back to generic HEAD request
        return APIs.generic(args, callback);
    } catch(E) {
        args.err = E;
        return callback(args);
    }
}


var APIs = {

    // all of these try to recurse on any result, or any error fall back to generic HEAD request

    isgd: function (args, callback) {
        var url = 'http://is.gd/forward.php?' + querystring.stringify({format: 'json', shorturl: args.urlp.pathname.replace('/', '')});
        request.get({url:url, timeout:timeout, json:true}, function(err, res, body){
            if(body && body.url) {
                args.url = body.url;
                return exports.expand(args, callback);
            }
            return APIs.generic(args, callback);
        });
    },

    googl: function (args, callback) {
        var url = 'https://www.googleapis.com/urlshortener/v1/url?'+querystring.stringify({shortUrl: args.urlp.href});
        request.get({url:url, timeout:timeout, json:true}, function(err, res, body){
            if(body && body.longUrl) {
                args.url = body.longUrl;
                return exports.expand(args, callback);
            }
            return APIs.generic(args, callback);
        });
    },

    budurl: function (args, callback) {
        var url = 'http://budurl.com/api/v1/budurls/expand?'+querystring.stringify({budurl: args.urlp.pathname.replace('/', '')});
        request.get({url:url, timeout:timeout, json:true}, function(err, res, body){
            if(body && body.long_url) {
                args.url = body.long_url;
                return exports.expand(args, callback);
            }
            return APIs.generic(args, callback);
        });
    },

    snipurl: function (args, callback) {
        var url = 'http://snipurl.com/resolveurl?'+querystring.stringify({id: args.urlp.pathname.replace('/', '')});
        request.get({url:url, timeout:timeout}, function(err, res, body){
            if(body) {
                args.url = body;
                return exports.expand(args, callback);
            }
            return APIs.generic(args, callback);
        });
    },

    generic: function (args, callback) {
        var headers = (args.urlp.host === "t.co")?{}:{'User-Agent': 'AppleWebKit/525.13 (KHTML, like Gecko) Safari/525.13.'}; // t.co returns meta refresh if browser!
        if(args.headers && args.headers['set-cookie']) headers['Cookie'] = args.headers['set-cookie']; // really dumb hack to enable cookie-tracking redirectors
        request.head({url:args.url, headers:headers, followRedirect:false}, function(err, res){
            if(err) { args.err = err; return callback(args); }
            // process a redirect
            if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307)
            {
                // re-basing like a browser would, yes sam, this happens
                var newup = urllib.parse(urllib.resolve(args.urlp,urllib.parse(res.headers.location)));
                // if the url is unparseable, bail out
                if (!newup || !newup.pathname) return callback(args);
                // if we're redirected to a login page, bail, kinda lame heuristic here but it works pretty well!
                if(newup.pathname.indexOf("login") > 0 && newup.pathname.indexOf("login") < 10) return callback(args);
                args.url = urllib.format(newup);
                args.headers = res.headers; // convenience for callback
                return exports.expand(args, callback);
            }
            args.headers = res.headers; // convenience for callback
            // everything else, we're done done!
            return callback(args);
        });
    }
};

exports.APIs = APIs;
