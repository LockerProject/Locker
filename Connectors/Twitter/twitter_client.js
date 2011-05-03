/*
 * This file is part of twitter-js
 *
 * Copyright (c) 2010 masylum <masylum@gmail.com>
 *
 * Licensed under the terms of MIT License. For the full copyright and license
 * information, please see the LICENSE file in the root folder.
 */

var url = require("url"),
    http = require('http'),
    OAuth = require('oauth').OAuth,
    querystring = require("querystring");

module.exports = function (api_key, api_secret, callbackURI) {
  var client = {version: '0.0.3'},

  // PRIVATE
      oAuth = new OAuth(
        'https://twitter.com/oauth/request_token',
        'https://twitter.com/oauth/access_token',
        api_key,
        api_secret,
        '1.0',
        callbackURI,
        'HMAC-SHA1',
        null,
        {'Accept': '*/*', 'Connection': 'close', 'User-Agent': 'twitter-js ' + client.version}
      ),
      rest_base = 'https://api.twitter.com/1',

      requestCallback = function (callback) {
        return function (error, data, response) {
          if (error) {
            callback(error, null);
          } else {
            try {
              callback(null, JSON.parse(data));
            } catch (exc) {
              callback(exc, null);
            }
          }
        };
      },

      get = function (path, params, token, callback) {
        oAuth.get(rest_base + path + '?' + querystring.stringify(params), token.oauth_token, token.oauth_token_secret, requestCallback(callback));
      },

      post = function (path, params, token, callback) {
        oAuth.post(rest_base + path, token.oauth_token, token.oauth_token_secret, params, null, requestCallback(callback));
      };

  // PUBLIC
  client.apiCall = function (method, path, params, callback) {
    var token = params.token;

    delete params.token;

    if (method === 'GET') {
      get(path, params, token, callback);
    } else if (method === 'POST') {
      post(path, params, token, callback);
    }
  };

  client.getAccessToken = function (req, res, callback) {

    var parsedUrl = url.parse(req.url, true),
        protocol = req.socket.encrypted ? 'https' : 'http',
        callbackUrl = protocol + '://' + req.headers.host + parsedUrl.pathname,
        has_token = parsedUrl.query && parsedUrl.query.oauth_token,
        has_secret = req.session.auth && req.session.auth.twitter_oauth_token_secret;

    // Acces token
    if (has_token &&  has_secret) {

      oAuth.getOAuthAccessToken(
        parsedUrl.query.oauth_token,
        req.session.auth.twitter_oauth_token_secret,
        parsedUrl.query.oauth_verifier,
        function (error, oauth_token, oauth_token_secret, additionalParameters) {
          if (error) {
            callback(error, null);
          } else {
            callback(null, {oauth_token: oauth_token, oauth_token_secret: oauth_token_secret});
          }
        }
      );

    // Request token
    } else {

      oAuth.getOAuthRequestToken(
        { oauth_callback: callbackUrl },
        function (error, oauth_token, oauth_token_secret, oauth_authorize_url, additionalParameters) {
          if (!error) {
            req.session.twitter_redirect_url = req.url;
            req.session.auth = req.session.auth || {};
            req.session.auth.twitter_oauth_token_secret = oauth_token_secret;
            req.session.auth.twitter_oauth_token = oauth_token;
            res.redirect("http://api.twitter.com/oauth/authorize?oauth_token=" + oauth_token);
          } else {
            callback(error, null);
          }
        }
      );
    }
  };

  return client;
};
