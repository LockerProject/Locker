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

var paging;
var base;

var dlPhotos = false;

var path = require("path");
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
        fs.writeFile(path.join(base, 'photos', filename + "." + extension), body, 'binary', callback);
    });
}

function getPhotoBinaries(photoObject, callback) {
    getPhotoBinary(getPhotoURL(photoObject), photoObject.id, function() {
        getPhotoBinary(getPhotoThumbURL(photoObject), photoObject.id + '-thumb', callback);
    });
}

var PER_PAGE = 500; //maximum of 500, but rate limit ~ 1/sec, so no need to increase
exports.sync = function(processInfo, callback) {
  base = processInfo.workingDirectory;
  paging = require(path.join(processInfo.absoluteSrcdir, 'lib', 'paging.js'));
  if (dlPhotos) {
    try {
        fs.mkdirSync(path.join(base, 'photos'), 0755);
    } catch(err) {
        if(err.code !== 'EEXIST') { // if it's already there, we're good
            callback(err);
            return;
        }
    }
  }

  if (!processInfo.config) processInfo.config = {};
    paging.getPage(processInfo, 'flickr.people.getPhotos', 'photo', PER_PAGE,
                   {extras:extras, user_id:processInfo.auth.user.nsid, min_upload_date:(processInfo.config.last_checked_date || 0)}, function(config, photosArray) {
        // If we're on the last page of a real result go ahead and update
        if (config && config.paging && config.paging["photo"] && config.paging["photo"].totalPages < 0) {
          config.last_checked_date = Date.now();
        }
        var data = [];
        for(var i in photosArray) {
          var photo = photosArray[i];
          //queue get photo
          data.push({obj:photo, timestamp:photo.lastupdate});
        }

        function done() {
            callback(null, {config: config, data: {photo:data}});
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
