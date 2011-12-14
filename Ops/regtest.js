// run from locker root and use export NODE_PATH=/Users/jer/Locker/Common/node/
var reg = require("./registry.js");
var lconfig = require('lconfig');
var logger = require('logger');
lconfig.load('Config/config.json');
var lcrypto = require('lcrypto');
lcrypto.loadKeys();

reg.init(lconfig, lcrypto, function(installed){
    logger.verbose("installed list: "+Object.keys(installed).join(","));
//    logger.debug(reg.getApps());
/*   reg.install({name:"linkvid@0.0.1"}, function(err){
       reg.update({name:"linkvid"}, function(err){
           logger.error("installed err("+err+")");
       });
   });
   reg.publish({dir:lconfig.lockerDir+"/"+lconfig.me+"/github/quartzjer/LinkPic"}, function(err){
       logger.error("published err("+err+")");
   });
   reg.install({name:"app-quartzjer-linkpic"}, function(err){
       logger.error("installed err("+err+")");
   });*/
});