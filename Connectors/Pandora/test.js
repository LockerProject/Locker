var sync = require(process.argv[2]);
sync.sync({auth:{webname:process.argv[3]},config:{}},function(e,js){
    console.error(e);
    console.error("got js:"+JSON.stringify(js));
});

