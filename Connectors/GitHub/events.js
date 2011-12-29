var request = require("request");

exports.sync = function(processInfo, cb) {
    var arg = processInfo.auth;
    arg.events = [];
    page(arg, function(err){
        cb(err, {data : {event: arg.events}});
    })
};

function page(arg, callback)
{
    if(!arg.url) arg.url = "https://api.github.com/users/"+arg.username+"/received_events?per_page=100&access_token="+arg.accessToken;
    var api = arg.url;
    if(arg.page) api += "&page="+arg.page;
//    console.error(api);
    request.get({uri:api, json:true}, function(err, resp, body){
        if(err || !body || !Array.isArray(body) || body.length == 0) return callback(err);
        body.forEach(function(e){arg.events.push(e)});
        arg.page = (arg.page) ? arg.page + 1 : 2;
        page(arg, callback);
    });
}