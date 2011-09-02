/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var extras = 'description,license,date_upload,date_taken,owner_name,icon_server,' +
             'original_format,last_update,geo,tags,machine_tags,o_dims' +
             'views,media,path_alias,url_sq,url_t,url_s,url_m,url_z,url_l,url_o';

var paging = require(__dirname + '/lib/paging');

var dlPhotos = false;

var fs = require('fs'),
    request = require('request'),
    async = require('async');

function getPhotoThumbURL(photoObject) {
    if(!photoObject)
        return null;
    return photoObject.url_sq;
}

function getPhotoURL(photoObject) {
    if(!photoObject)
        return null;
    return photoObject.url_o || photoObject.url_l || photoObject.url_z || photoObject.url_m || photoObject.url_s || photoObject.url_t;
}

function getPhotoBinary(url, filename, callback) {
    request.get({uri:url, encoding:'binary'}, function(err, resp, body) {
        var contentType = resp.headers['content-type'];
        var extension = contentType.substring(contentType.lastIndexOf('/') + 1);
        fs.writeFile('photos/' + filename + "." + extension, body, 'binary', callback);
    });
}

function getPhotoBinaries(photoObject, callback) {
    getPhotoBinary(getPhotoURL(photoObject), photoObject.id, function() {
        getPhotoBinary(getPhotoThumbURL(photoObject), photoObject.id + '-thumb', callback);
    });
}

var PER_PAGE = 50;
exports.sync = function(processInfo, callback) {
    try {
        fs.mkdirSync('photos', 0755);
    } catch(err) {
        if(!(err.code === 'EEXIST' && err.errno === 17)) { // if it's already there, we're good
            callback(err);
            return;
        }
    }
    
    paging.getPage(processInfo, 'flickr.people.getPhotos', 'photo', PER_PAGE, 
                   {extras:extras, user_id:processInfo.auth.user.nsid}, function(config, photosArray) {
        config.lastUpdateTimes = config.lastUpdateTimes || {};
        var data = [];
        for(var i in photosArray) {
            var photo = photosArray[i];
            if(!config.lastUpdateTimes[photo.id] ||                    // new OR
                config.lastUpdateTimes[photo.id] < photo.lastupdate) { // update
                config.lastUpdateTimes[photo.id] = photo.lastupdate;
                //queue get photo
                data.push({obj:photo, timestamp:photo.lastupdate});
            }
        }
        
        
        function done() {
            callback(null, {config: config,
                            data: {photo:data}});
        }
        
        if(dlPhotos) {
            async.forEach(data, function(evtObject, callback) {
                getPhotoBinaries(evtObject.obj, callback);
            }, done);
        } else {
            done();
        }
        
    });
}
