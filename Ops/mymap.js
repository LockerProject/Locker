var fs = require('fs');
var path = require('path');
var request = require('request');
var exec = require('child_process').exec;
var async = require('async');
var map = [];
var local = {};

loadMe();
scanLocal(path.join(__dirname,"../Apps"));
scanLocal(path.join(__dirname,"../Connectors"));
scanLocal(path.join(__dirname,"../Collections"));

request.get({uri:"http://registry.singly.com/-/all", json:true}, function(e,r,reg){
    async.forEachSeries(map, function(svc, cb){
        console.log([svc.version, svc.handle, svc.srcdir, svc.type].join('\t'));
        if(!reg[svc.handle]){
            console.log("\tNOT IN REGISTRY");
            return cb();
        }
        if(svc.version != reg[svc.handle]["dist-tags"].latest) console.log("\tDIFFERS from registry of "+reg[svc.handle]["dist-tags"].latest);
        var stat = fs.statSync(path.join(__dirname, "..", svc.srcdir));
        if(stat.mtime.getTime() > svc.upserted) console.log("\tWARNING, srcdir changed since last upsert! (newer package/synclet.json changes ignored)");
        if(!local[svc.handle]) return cb();
        if(svc.version != local[svc.handle].version) console.log("\tVERSION differs from LOCAL of "+local[svc.handle].version);
        if(svc.srcdir == local[svc.handle].srcdir) return cb();
        exec('diff -x ".DS_Store" -r '+path.join(__dirname,"..",svc.srcdir)+' '+local[svc.handle].srcdir, function(err, stdout, stderr){
            if(err) console.log("\tLOCAL CHANGES FOUND, need to upsert? \n\t"+stdout.split("\n").join("\t\n"));
            cb();
        });
    },console.error);
});

function loadMe()
{
    var me = path.join(__dirname,"../Me");
    var dirs = fs.readdirSync(me);
    for (var i = 0; i < dirs.length; i++) {
        if(dirs[i] == "diary") continue;
        var dir =  path.join(me, dirs[i]);
        try {
            if(!fs.statSync(dir).isDirectory()) continue;
            if(!path.existsSync(path.join(dir, 'me.json'))) continue;
            map.push(JSON.parse(fs.readFileSync(path.join(dir, 'me.json'), 'utf8')));
        } catch (E) {
            logger.error(dir+" failed (" +E+ ")");
        }
    }

}

function scanLocal(base)
{
    var dirs = fs.readdirSync(base);
    for (var i = 0; i < dirs.length; i++) {
        var dir =  path.join(base, dirs[i]);
        try {
            if(!fs.statSync(dir).isDirectory()) continue;
            if(!path.existsSync(path.join(dir, 'package.json'))) continue;
            var js = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
        } catch (E) {
            logger.error(dir+" failed (" +E+ ")");
        }
        if(!js.repository || !js.repository.handle) continue;
        local[js.repository.handle] = js;
        js.srcdir = dir;
    }

}