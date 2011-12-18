module.exports = {
    endPoint : "https://accounts.google.com/o/oauth2/token",
    grantType : "authorization_code",
    handler : {oauth2 : 'POST'},
    authUrl : "https://accounts.google.com/o/oauth2/auth?cope=https://www.googleapis.com/auth/plus.me&response_type=code"
}