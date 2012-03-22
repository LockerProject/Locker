exports.callApi = function(pi, cb, pather, querier, arrayer) {
  var https = require('https');

  var authorization = 'Basic ' + new Buffer(pi.auth.username + ':' +
    pi.auth.password).toString('base64');

  var options = {
    host: 'api.myzeo.com',
    port: 8443,
    path: '/zeows/api/v1/json' + pather(pi) + querier(pi),
    headers: {
      'Accept': '*/*',
      'Connection': 'close',
      'Referer': pi.uri,
      'Authorization': authorization
    }
  };

  // Send the request
  https.get(options, function(res) {
    res.setEncoding('utf8');

    var data = '';

    res.on('data', function(chunk) {
      data += chunk;
    });

    // Once we've got the full response...
    res.on('end', function() {
      cb(data);
    });
  });
};

exports.genericSync = function(type, pather, querier, arrayer) {
  return function(pi, cb) {
    exports.callApi(pi, function(data) {
      var js;

      try {
        js = JSON.parse(data);
      } catch(E) {
        return cb(err);
      }

      arrayer(pi, js, function(arrayData) {
        var array = {};

        array[type] = arrayData;

        // And return it using the passed in callback,
        // with (optionally) updated auth and config data
        cb(null, {
          auth: pi.auth,
          config: pi.config,
          data: array
        });
      });
    }, pather, querier, arrayer);
  };
};
