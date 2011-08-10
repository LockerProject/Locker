/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

var fb = require('../../Connectors/Facebook/lib.js')
  , async = require('async')
  , photos = []
  ;

exports.sync = function(processInfo, cb) {
    fb.init(processInfo.auth);
    exports.syncPhotos(function(err) {
        if (err) console.error(err);
        var responseObj = {data : {}};
        responseObj.data.photo = photos;
        cb(err, responseObj);
    });
};

exports.syncPhotos = function(callback) {
    // use a queue so we know when all the albums are done individually async'ly processing
    var albums = [];
    fb.getAlbums({id:"me"},function(album){albums.push(album);},function(){
        async.forEach(albums,function(album,cbDone){
            fb.getAlbum({id:album.id},function(photo){
                photos.push({'obj' : photo, timestamp: new Date(), type : 'new'});            
            },cbDone);
        },callback);
    });
}