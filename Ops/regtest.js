// run from locker root and use export NODE_PATH=/Users/jer/Locker/Common/node/
var reg = require("./registry.js");
var lconfig = require('lconfig');
lconfig.load('Config/config.json');

reg.init(lconfig, function(installed){
    console.log("installed: "+Object.keys(installed).join(","));
    console.log(reg.getViewers());
/*   reg.install({name:"linkvid@0.0.1"}, function(err){
       reg.update({name:"linkvid"}, function(err){
           console.log("installed: "+err);
       });
   }); */
});