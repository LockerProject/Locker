module.exports = {
    endPoint : 'https://github.com/login/oauth',
    handler : {oauth2 : 'GET'},
    authUrl : 'https://github.com/login/oauth/authorize?scope=repo&response_type=code'
};
