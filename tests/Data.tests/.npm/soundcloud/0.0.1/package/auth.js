module.exports = {
    endPoint : "https://api.soundcloud.com/oauth2/token",
    grantType : "authorization_code",
    handler : {oauth2 : 'POST'},
    authUrl : "https://soundcloud.com/connect/?response_type=code"
}