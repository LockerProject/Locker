var fs = require('fs');
var auth = JSON.parse(fs.readFileSync("../../Me/bodymedia/me.json")).auth;
console.error(auth);

var sync = require(process.argv[2]);
sync.sync({auth:auth},function(e,js){
    console.error(e);
    console.error("got js:"+JSON.stringify(js));
});

//var OAlib = require('oauth').OAuth;
//var OA = new OAlib(null, null, auth.consumerKey, auth.consumerSecret, '1.0', null, 'HMAC-SHA1', null, {'Accept': '*/*', 'Connection': 'close'});
//OA.get(process.argv[2], auth.token, auth.tokenSecret, function(err, body){
//    if(err) console.error(err);
//    console.log(body);
//});

/*
var request = require('request');
var oauth = { consumer_key: auth.consumerKey, consumer_secret: auth.consumerSecret, token: auth.token, token_secret: auth.tokenSecret};
request.get({url:process.argv[2], oauth:oauth, json:true}, function (err, r, body) {
    if(err) console.error(err);
    console.log(body)
})
*/