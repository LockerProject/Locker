function pagedApiCall(params, offset_fn, data_fn) {
    return function (pi, cb) {
        var OAuth = require('oauth').OAuth;
        var oa = new OAuth(null
                         , null
                         , pi.auth.consumerKey
                         , pi.auth.consumerSecret
                         , '1.0'
                         , null
                         , 'HMAC-SHA1'
                         , null
                         , {'Accept'     : '*/*'
                          , 'Connection' : 'close'}
        );

        var offset = offset_fn(pi);
        if (!offset) {
            return cb(null, {config : pi.config, data : {}}); // nothing to do
        }
        else {
            params.start = pi.config.connStart;
        }

        oa.post('http://api.rdio.com/1/'
              , pi.auth.token
              , pi.auth.tokenSecret
              , params
              , null
              , function (err, body) {
                    var js;

                    try {
                        js = JSON.parse(body);
                    }
                    catch (E) { return cb(err); }

                    var data = {};
                    data[params.type] = data_fn(pi, js);
                    cb(err, {config : pi.config, data : data});
                }
        );
    };
};

function apiCall(params, data_fn) {
    return function (pi, cb) {
        var OAuth = require('oauth').OAuth;
        var oa = new OAuth(null
                         , null
                         , pi.auth.consumerKey
                         , pi.auth.consumerSecret
                         , '1.0'
                         , null
                         , 'HMAC-SHA1'
                         , null
                         , {'Accept'     : '*/*'
                          , 'Connection' : 'close'}
        );

        oa.post('http://api.rdio.com/1/'
              , pi.auth.token
              , pi.auth.tokenSecret
              , params
              , null
              , function (err, body) {
                    var js;

                    try {
                        js = JSON.parse(body);
                    }
                    catch (E) { return cb(err); }

                    var data = {};
                    data[params.method] = data_fn(pi, js);
                    cb(err, {config : pi.config, data : data});
                }
        );
    };
};

exports.getSelf = function (pi, cb) {
    apiCall({method : 'currentUser'}
          , function (pi, js) { return js; }
    )(pi, cb);
}
