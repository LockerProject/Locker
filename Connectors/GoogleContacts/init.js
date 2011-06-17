// this is a common pattern many connectors use, it processes the startup data and eventfully loads the auth.js, sync-api.js, etc
var fs = require('fs');

require.paths.push(__dirname);
require('connector/client').init({},function(app){
    app.get('/photo/:id', function(req, res) {
        var photo = req.param("id");
        var stream = fs.createReadStream('photos/' + photo + '.jpg');
        var head = false;
        stream.on('data', function(chunk) {
            if(!head) {
                head = true;
                res.writeHead(200, {'Content-Disposition': 'attachment; filename=' + photo + '.jpg'});
            }
            res.write(chunk, "binary");
        });
        stream.on('error', function() {
            res.writeHead(404);
            res.end();
        });
        stream.on('end', function() {
            res.end();
        });
    });
});
