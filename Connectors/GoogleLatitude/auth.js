module.exports = {
    endPoint : "https://accounts.google.com/o/oauth2/token",
    grantType : "authorization_code",
    handler : "oauth2Post",
    authUrl : "https://accounts.google.com/o/oauth2/auth?scope=https://www.googleapis.com/auth/latitude.all.best&response_type=code"
}