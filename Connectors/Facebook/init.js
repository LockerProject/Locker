// this is a common pattern many connectors use, it processes the startup data and eventfully loads the auth.js, sync-api.js, etc
require.paths.push(__dirname);
require('connector/client').init({"oauth2" :
    {"provider" : "Facebook",
     "endPoint" : "https://graph.facebook.com/oauth",
     "linkToCreate" : "http://www.facebook.com/developers/createapp.php",
     "extraParams" : "scope=email,offline_access,read_stream,user_photos,friends_photos,publish_stream,user_photo_video_tags"}
});
