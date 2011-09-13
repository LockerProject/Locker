var fs = require("fs");
var t = require("./lib.js");
var me = JSON.parse(fs.readFileSync('../../Me/tumblr/me.json'));
t.init(me.auth);
var me;
t.getMe({},function(js){  console.log("ME\t"+JSON.stringify(js)); me=js}, function(err){
	if(err) console.log("error: "+err);
	t.getFollowing({},function(js){  console.log("FRIEND\t"+JSON.stringify(js));}, function(err){ if(err) console.log("error: "+err);});
//	t.getDashboard({},function(js){  console.log("DASHPOST\t"+JSON.stringify(js));}, function(err){ if(err) console.log("error: "+err);});
	t.getPosts({blog:me.primary},function(js){  console.log("BLOGPOST\t"+JSON.stringify(js));}, function(err){ if(err) console.log("error: "+err);});

});
