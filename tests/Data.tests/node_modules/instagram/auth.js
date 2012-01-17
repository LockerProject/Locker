module.exports = {
    endPoint : "https://api.instagram.com/oauth/access_token",
    grantType : "authorization_code",
    handler : {oauth2 : 'POST'},
    authUrl : "https://api.instagram.com/oauth/authorize/?response_type=code"
}