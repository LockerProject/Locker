var Flickr = require('flickr-js');

exports.getPage = function(processInfo, endpoint, type, perPage, params, callback) {
    var config = processInfo.config || {};
    var auth = processInfo.auth;
    var client = new Flickr(auth.apiKey, auth.apiSecret);
    config.paging = config.paging || {};
    if(!config.paging.lastPage)
        config.paging.lastPage = 0;
    var thisPage = config.paging.lastPage + 1;
    config.lastUpdate = Date.now();
    params.auth_token = auth.token._content;
    params.per_page = perPage;
    params.page = thisPage;
    
    var type_s = type + 's';
    
    client.apiCall('GET', endpoint, params,
        function(err, resp, body) {
        if(err)
            console.error('Network Error: ', err);
        else {
            var json = JSON.parse(body);
            var page = parseInt(json[type_s].page);
            var pages = parseInt(json[type_s].pages);
            if(page > pages) { //whoa whoa whoa, bad news bears, page should never be greater than pages
                // seems like there is a possiblity of pages === 0 if there are no photos
                config.paging.lastPage = 0;
                config.nextRun = 0;
                console.error('Flickr error, page > total pages: page ==', json[type_s].page, ', pages ==', json[type_s].pages);
            } else if(page === pages) { // last page
                config.paging.lastPage = 0;
                config.nextRun = 0;
            } else { // still paging
                config.paging.lastPage = page;
                config.nextRun = -1;
            }
            callback(config, json[type_s][type]);
        }
    });
}