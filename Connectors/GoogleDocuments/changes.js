var request = require("request");
var crypto = require('crypto');

exports.sync = function(processInfo, cb) {
    var arg = processInfo.auth;
    arg.changes = [];
    page(arg, function(err){
        cb(err, {data : {change: arg.changes}});
    })
};

function page(arg, callback)
{
    if(!arg.url) arg.url = "https://docs.google.com/feeds/default/private/changes?alt=json&v=3";
    var api = arg.url + "&access_token="+arg.token.access_token;
    console.error(api);
    request.get({uri:api, json:true}, function(err, resp, body){
        if(err || !body || !body.feed || !body.feed.entry || !Array.isArray(body.feed.entry) || body.feed.entry.length == 0) return callback(err);
        body.feed.entry.forEach(function(e){
            // create our own custom id since none of theirs is suitable
            e._id =  crypto.createHash('md5').update(e.id["$t"]).digest('hex');
            arg.changes.push(e);
        });
        var next;
        if(Array.isArray(body.feed.link)) body.feed.link.forEach(function(l){ if(l.rel == 'next') next = l.href;});
        if(!next || next == arg.url) return callback();
        arg.url = next;
        page(arg, callback);
    });
}