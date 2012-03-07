module.exports = {
    endPoint : "https://api.pinterest.com/v2/oauth/access_token",
    grantType : "authorization_code",
    handler : {oauth2 : 'POST'},
    authUrl : "https://pinterest.com/oauth/authorize/?response_type=code&scope=read_write"
}