module.exports = {
    endPoint : "https://accounts.google.com/o/oauth2/token",
    grantType : "authorization_code",
    handler : {oauth2 : 'POST'},
    authUrl : "https://accounts.google.com/o/oauth2/auth?scope=https://docs.google.com/feeds/&response_type=code&access_type=offline&approval_prompt=force"
}