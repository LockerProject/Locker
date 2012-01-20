var fs = require("fs");
var me = JSON.parse(fs.readFileSync(process.argv[2]));
console.log("using "+JSON.stringify(me.auth));
var sync = require(process.argv[3]);
if(process.argv[4])
{
    me.syncletToRun = {posts:[]};
    me.syncletToRun.posts.push(JSON.parse(process.argv[4]));
}
sync.sync(me, function(err, data){
    if(err) console.error(err);
    if(data) console.log(JSON.stringify(data));
});