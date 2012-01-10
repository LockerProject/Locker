// must be run in Me directory

// make sure node_modules and set npm to run locally here

// first, load registry
// once done, fire meScan()

function meScan()
{
    var dirs = fs.readdirSync(".");
    for (var i = 0; i < dirs.length; i++) {
        if(dirs[i] == "diary") continue;
        var dir =  lconfig.me + '/' + dirs[i];
        try {
            if(!fs.statSync(dir).isDirectory()) continue;
            if(!path.existsSync(path.join(dir, 'me.json'))) continue;
            var js = JSON.parse(fs.readFileSync(path.join(dir, 'me.json'), 'utf8'));
            // first skip if it's done
            if(js.installed) continue;
            js.installed = Date.now();
            if(js.srcdir.indexOf("Collections") == 0)
            {
                // MERGE with srcdir handle.collection !
                // rewrite me.json
                continue;
            }
            // extract id and find in registry (all apps and connectors should be there)
            //      install from npm, once done, merge package.json's repository, set srcdir, and rewrite me.json
            // if not found, WARN
        } catch (E) {
            console.error(dirs[i]+" failed (" +E+ ")");
        }
    }

}