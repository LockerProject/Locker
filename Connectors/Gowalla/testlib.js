var fs = require("fs");
var me = JSON.parse(fs.readFileSync('../../Me/gowalla/me.json'));

var t = require("./lib.js");
t.init(me.auth);
var me;
t.getMe({},function(js){  console.log("ME\t"+JSON.stringify(js)); me=js}, function(err){
  if(err) console.log("error: "+err);
  t.getPins({path:me.url},function(js){  console.log("PIN\t"+JSON.stringify(js));}, function(err){ if(err) console.log("error: "+err);});

});

/*
var posts = require("./checkins.js");
posts.sync({auth:me.auth},function(e,js){
    console.error("got e:"+e);
    console.error("got js:"+JSON.stringify(js));
});
*/