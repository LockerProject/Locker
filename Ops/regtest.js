// run from locker root and use export NODE_PATH=/Users/jer/Locker/Common/node/
var reg = require("./registry.js");
var lconfig = require('lconfig');
lconfig.load('Config/config.json');
var lcrypto = require('lcrypto');
lcrypto.loadKeys();

reg.init(lconfig, lcrypto, function(installed){
    console.log("installed list: "+Object.keys(installed).join(","));
//    console.log(reg.getApps());
/*   reg.install({name:"linkvid@0.0.1"}, function(err){
       reg.update({name:"linkvid"}, function(err){
           console.log("installed err("+err+")");
       });
   });
   reg.publish({dir:lconfig.lockerDir+"/"+lconfig.me+"/github/quartzjer/LinkPic"}, function(err){
       console.log("published err("+err+")");
   });
   reg.install({name:"app-quartzjer-linkpic"}, function(err){
       console.log("installed err("+err+")");
   });*/
});