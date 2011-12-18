module.exports = {
    endPoint : 'https://foursquare.com/oauth2/',
    grantType : 'authorization_code',
    handler : {oauth2 : 'GET'},
    authUrl : 'https://foursquare.com/oauth2/authenticate?response_type=code'
};