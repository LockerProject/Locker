var fs = require("fs");
var ig = require("./lib.js");
var me = JSON.parse(fs.readFileSync('../../Me/instagram/me.json'));
ig.init(me.auth);
var me;
ig.getSelf({},function(js){  console.log("ME\t"+JSON.stringify(js)); me=js}, function(err){ if(err) console.log("error: "+err); } );
//ig.getMedia({},function(js){  console.log("PHOTO\t"+JSON.stringify(js));}, function(err){ if(err) console.log("error: "+err);});
//ig.getFollows({},function(js){  console.log("FRIEND\t"+JSON.stringify(js));}, function(err){ if(err) console.log("error: "+err);});
//ig.getFeed({},function(js){  console.log("FEED\t"+JSON.stringify(js));}, function(err){ if(err) console.log("error: "+err);});


var posts = require("./self.js");
posts.sync({auth:me.auth,config:{feedSince:"290747080_10726078"}},function(e,js){
    console.error("got e:"+e);
    console.error("got js:"+JSON.stringify(js));
});
