// node-oauth doesn't provide a method for created signed requests with
// query string parameters instead of Authorization headers, so this is a hack.
function authQueryStringFromUrl(OA, pi, host, url, path) {
  var params = OA._prepareParameters(pi.auth.token, pi.auth.tokenSecret, 'HMAC-SHA1', url);

  // Remove the OAuth signature from the parameters (we'll generate it again below)
  for (var i in params) {
    if (params[i][0] == 'oauth_signature') {
      delete params[i];

      break;
    }
  }

  // OAuth query string parameters need to be sorted
  // alphabetically before the signature is generated.
  params = params.sort(function(a, b) {
    return a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0;
  });

  var output = [];

  // Build the query string
  for (var parameter in params) {
    output.push(params[parameter][0] + '=' + params[parameter][1]);
  }

  // Add the signature of the query string to the end of the query string
  output.push('oauth_signature=' + OA._encodeData(OA._getSignature('GET',
    'http://' + host + path, output.join('&'), pi.auth.tokenSecret)));

  return '?' + output.join('&');
}

exports.deviceSync = function(device, pather, querier, arrayer) {
  // pi: process info
  return function(pi, cb) {
    var OAlib = require('oauth').OAuth;
    var OA = new OAlib(null, null, pi.auth.consumerKey, pi.auth.consumerSecret, '1.0', null, 'HMAC-SHA1', null);
    var http = require('http');

    var host = 'wbsapi.withings.net';

    var url = 'http://' + host + pather(pi) + querier(pi);

    var queryString = authQueryStringFromUrl(OA, pi, host, url, pather(pi));

    // Setup our own HTTP request since we're using
    // query string authorization
    var options = {
      host: host,
      port: 80,
      path: pather(pi) + queryString,
      headers: {
        'Accept': '*/*',
        'Connection': 'close'
      }
    };

    // Send the request
    http.get(options, function(res) {
      res.setEncoding('utf8');

      var data = '';

      res.on('data', function(chunk) {
        data += chunk;
      });

      // Once we've got the full response...
      res.on('end', function() {
        var js;

        // Try parsing it...
        try {
          js = JSON.parse(data);
        } catch(E) {
          return cb(E);
        }

        var array = {};

        array[device] = arrayer(pi, js);

        // And return it using the passed in callback,
        // with (optionally) updated auth and config data
        cb(null, {
          auth: pi.auth,
          config: pi.config,
          data: array
        });
      });
    });
  };
};
