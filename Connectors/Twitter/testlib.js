var fs = require("fs");
var tw = require("./lib.js");
var auth = JSON.parse(fs.readFileSync(process.argv[2]));
console.log("passing auth: "+JSON.stringify(auth));
tw.init(auth);
var me;
tw.getMe({},function(js){  console.log("ME\t"+JSON.stringify(js)); me=js}, function(err){
	if(err) console.log("error: "+err);
	tw.getMyFriends({},function(js){  console.log("FRIEND\t"+JSON.stringify(js));}, function(err){ if(err) console.log("error: "+err);});
	tw.getFollowers({screen_name:me.screen_name},function(js){  console.log("FOLLOWER\t"+JSON.stringify(js));}, function(err){ if(err) console.log("error: "+err);});
});
