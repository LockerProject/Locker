// this is a common pattern many connectors use, it processes the startup data and eventfully loads the auth.js, sync-api.js, etc
var fs = require('fs');
require.paths.push(__dirname);
require('connector/client').init({"oauth2" :
    {"provider" : "Foursquare",
     "appIDName" : "Client ID",
     "appSecretName" : "Client Secret",
     "authEndpoint" : "authenticate",
     "accessTokenResponse" : "json",
     "endPoint" : "https://foursquare.com/oauth2/",
     "linkToCreate" : "https://foursquare.com/oauth/register",
     "grantType" : "authorization_code"}}, function(app) {
    app.get('/getPhoto/:id', function(req, res) {
        var stream = fs.createReadStream('photos/' + req.param('id') + '.jpg');
        var head = false;
        stream.on('data', function(chunk) {
            if(!head) {
                head = true;
                res.writeHead(200, {'Content-Disposition': 'attachment; filename=' + req.param('id') + '.jpg'});
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