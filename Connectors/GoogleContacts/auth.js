module.exports = {
    endPoint : "https://accounts.google.com/o/oauth2/token",
    grantType : "authorization_code",
    handler : {oauth2 : 'POST'},
    authUrl : "https://accounts.google.com/o/oauth2/auth?scope=https://www.google.com/m8/feeds/&response_type=code"
}