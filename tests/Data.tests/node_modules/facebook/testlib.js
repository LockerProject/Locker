var fs = require("fs");
var fb = require("./lib.js");
var auth = JSON.parse(fs.readFileSync(process.argv[2]));
console.log("passing auth: "+JSON.stringify(auth));
fb.init(auth);
fb.getPerson({id:"me"},function(me){    console.log("ME\t"+JSON.stringify(me));}, function(err){    if(err) console.log("error: "+err); });
fb.getFriends({id:"me"},function(f){console.log("FRIEND\t"+JSON.stringify(f));}, function(err){if(err) console.log("error: "+err); });
fb.getAlbums({id:"me"},function(f){
    console.log("ALBUM\t"+JSON.stringify(f));
    fb.getAlbum({id:f.id},function(f){
        console.log("PHOTO\t"+JSON.stringify(f));
        fb.getPhoto({id:f.id},function(f){console.log("PHOTO\t"+JSON.stringify(f));}, function(err){if(err) console.log("error: "+err); });
    }, function(err){if(err) console.log("error: "+err); });
}, function(err){if(err) console.log("error: "+err); });
fb.getPosts({id:"me",type:"home"},function(f){console.log("POST\t"+JSON.stringify(f));}, function(err){if(err) console.log("error: "+err); });
