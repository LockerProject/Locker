module.exports = {
    endPoint : "https://api.gowalla.com/api/oauth/token",
    grantType : "authorization_code",
    handler : {oauth2 : 'POST'},
    authUrl : "https://gowalla.com/api/oauth/new?"
}