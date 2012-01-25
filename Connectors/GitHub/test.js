var fs = require('fs');
var pi = {lockerUrl:'http://localhost:8042'};
pi.auth = JSON.parse(fs.readFileSync("../../Me/github/me.json")).auth;
if(process.argv[3])
{
    auth.syncletToRun = {posts:[]};
    auth.syncletToRun.posts.push(JSON.parse(process.argv[3]));
}
console.error(pi);
var sync = require(process.argv[2]);
sync.sync(pi,function(e,js){
    console.error(e);
    console.error("got js:"+JSON.stringify(js));
});
