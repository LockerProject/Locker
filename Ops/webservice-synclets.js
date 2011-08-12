var syncManager = require('lsyncmanager');
var lconfig = require('lconfig');

module.exports = function(locker) {
    // get all the information about synclets
    locker.get('/synclets', function(req, res) {
        res.writeHead(200, {
            'Content-Type': 'text/javascript',
            "Access-Control-Allow-Origin" : "*" 
        });
        res.end(JSON.stringify(syncManager.synclets()));
    });    

    // given a bunch of json describing a synclet, make a home for it on disk and add it to our map
    locker.post('/synclets/:id/install', function(req, res) {
        var id = req.params.id;
        var js;
        try{
            js = JSON.parse(req.body);
            if(!js.auth) throw new Error("no auth");
            if(!js.synclets) throw new Error("now snyclets");
            JSON.parse(fs.readFileSync(path.join(lconfig.lockerDir, lconfig.me, id, 'me.json'), 'utf-8')); // just to test validity
        }catch(E){
            console.error("installing synclets failed: "+E);
            res.writeHead(404);
            res.end("{}");
            return;            
        }
        var metaData = syncManager.install(id,js.auth.js.synclets);
        res.writeHead(200, {
            'Content-Type': 'application/json'
        });
        res.end('{"done":true}');
    });
    
    locker.get('/synclets/:id/run', function(req, res) {
        syncManager.syncNow(req.params.id, function() {
            res.writeHead(200);
            res.end('DONE');
        })
    });
};