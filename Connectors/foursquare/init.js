// this is a common pattern many connectors use, it processes the startup data and eventfully loads the auth.js, sync-api.js, etc
require.paths.push(__dirname);
require('connector/client').init({"oauth2" :
    {"provider" : "Foursquare",
     "appIDName" : "Client ID",
     "appSecretName" : "Client Secret",
     "authEndpoint" : "authenticate",
     "accessTokenResponse" : "json",
     "endPoint" : "https://foursquare.com/oauth2/",
     "linkToCreate" : "https://foursquare.com/oauth/register",
     "grantType" : "authorization_code",
     "height" : 540}});