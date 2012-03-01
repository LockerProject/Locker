
var url = require('url');
var longus = require('./longus');
var sax =  require("sax");
var readability = require("readabilitySAX");
var request = require('request');

// simply expand a given url
exports.expandUrl = function(arg, cbEach, cbDone) {
    if(!arg.url) return cbDone("no url");
    longus.expand(arg, function(a){
        if(!a || !a.url) return cbDone("invalid url")
        cbEach(a.url);
        cbDone();
    });
}

// find/iterate through all possible urls in any random text
exports.extractUrls = function(arg, cbEach, cbDone) {
    if(!arg.text) return cbDone("no text");
    var regexToken = /((?:https?:\/\/|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/g;

    // when you use /g on a regex it magically maintains state between .exec() calls, CRAZY TIMES!
    while( (matchArray = regexToken.exec( arg.text )) !== null )
    {
        var str = matchArray[0];
        // gotta do sanity cleanup for url.parse, it makes no assumptions I guess :/
        if(str.substr(0,4).toLowerCase() != "http") str = "http://"+str;
        if(str.indexOf('&quot') == str.length - 5) str = str.substr(0, str.indexOf('&quot')); // stupid twitter escaping
        var u = url.parse(str);
        if(!u.host || u.host.indexOf(".") <= 0 || u.host.length - u.host.indexOf(".") < 3) continue; // TODO: fully normalize
        if(u.hash === '#') u.hash = ''; // empty hash is nothing, normalize that by a pound
        cbEach(url.format(u));
    }
    cbDone();
}

// take the html of a page and extract the title and text
exports.extractText = function(arg, cbEach, cbDone) {
    if(!arg.html) return cbDone("no html");

    var contentLength = 0, skipLevel = 0, parser, readable, ret;

    try{
        // keep skipping unless/until we have a decent amount of text
        while(contentLength < 250 && skipLevel < 4){
            parser = sax.parser(false, { lowercasetags : true });
            readable = new readability.process(parser, {skipLevel:skipLevel});
            parser.write(arg.html).close();
            ret = readable.getArticle("text");
            contentLength = ret.textLength;
            skipLevel += 1;
        }
    }catch(E){
        return cbDone(E);
    }

    if(ret)
    {
        // normalize all whitespace nicely
        if (ret.text) ret.text = ret.text.replace(/\s+/g, ' ');
        if (ret.title) ret.title = ret.title.replace(/\s+/g, ' ');
        cbEach(ret);
    }
    cbDone();
}

// take the html of a page and determine the favicon
exports.extractFavicon = function(arg, cbEach, cbDone) {
    if(!arg.url) return cbDone("no url");
    // TODO: use regex to look for it in arg.html:
    // /<link.*?href=("|\')(.*?)("|\').*?rel=("|\').*icon("|\')/i
    // /<link.*?rel=("|\').*icon("|\').*?href=("|\')(.*?)("|\')/i
    var u = url.parse(arg.url);
    cbEach(url.resolve(u,"/favicon.ico"));
    cbDone();
}

// handy wrapper
exports.fetchHTML = function(arg, cbEach, cbDone) {
    if(!arg.url) return cbDone("no url");
    // sending blank accept encoding I guess means "none"
    try {
      var x = request.get({uri:arg.url, headers:{"Accept":"text/html","Accept-Encoding":""}, timeout:5000},function(err,resp,body){
        x = undefined;
        if(err || resp.statusCode != 200 || !resp.headers["content-type"] || resp.headers["content-type"].indexOf("text/html") != 0) return cbDone(err);
        cbEach(body);
        cbDone();
      });
      // worst case, 10 seconds bail
      setTimeout(function(){
          if(x && x.req) x.req.destroy();
      }, 10000);
    } catch(E) {
        cbDone(E);
    }
}

