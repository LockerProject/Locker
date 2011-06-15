// this is a common pattern many connectors use, it processes the startup data and eventfully loads the auth.js, sync-api.js, etc
require.paths.push(__dirname);
require('connector/client').init({"oauth2" :
    {"provider" : "Github",
     "appIDName" : "Client ID",
     "promptForUsername" : true,
     "appSecretName" : "Secret",
     "authEndpoint" : "authorize",
     "endPoint" : "https://github.com/login/oauth",
     "linkToCreate" : "https://github.com/account/applications/new"}
});
