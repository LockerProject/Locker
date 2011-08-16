/* Generic log function for debugging. */
var log = function(msg) { if (console && console.log) console.debug(msg); }

/**
 * Reload the display (get photos, render them)
 * @property offset {Integer} Optional Where in the photos collection you want to start.
 * @property limit {Integer} Optional The number of photos you want returned.
 * @property useJSON {Boolean} Optional Display raw JSON instead of the photo's name.
 */
function reload(offset, limit, useJSON) {
    // set the params if not specified
    var offset = offset || 0; 
    var limit = limit || 100;
    var useJSON = useJSON || false;

    var getPhotosCB = function(photos) {
    photos = photos.sort(function(lh, rh) {
        var rhc = parseInt(rh.timestamp);
        var lhc = parseInt(lh.timestamp);
        console.log(rhc);
        console.log(lhc);
        if (isNaN(rhc) || isNaN(lhc)) {
            console.dir(rh);
            console.dir(lh);
        }
        if (rhc > (Date.now() / 1000)) rhc = rhc / 1000;
        if (lhc > (Date.now() / 1000)) lhc = lhc / 1000;
        return rhc - lhc;
    });
    console.log(photos);
	// find the unordered list in our document to append to
        var photosList = $("#main");

	// clear the list
	photosList.html('');
	
	// populate the list with our photos
	if (photos.length == 0) photosList.append("<div>Sorry, no photos found!</div>");
        for (var i in photos) {
	    photo = photos[i];
	    
	    var title = photo.title ? photo.title : "";
            
	    photoHTML = '<div id="' + photo._id + '" class="photo"><img src="/Me/photos/fullPhoto/' + photo.id+ '" style="max-width:300px" /><div class="basic-data">'+title+'</div></div>';
	    photosList.append(photoHTML);
	}

        var $container = photosList;
  
        $container.imagesLoaded( 
            function(){
                $container.masonry({
                                       itemSelector : '.photo'
                                   });
            });
    };

    $.getJSON(
	'/query/getPhoto',
	{'offset':offset, 'limit':limit}, 
	getPhotosCB
    );
}

/* jQuery syntactic sugar for onDomReady */
$(function() {
    reload(0, 9000, false);
});
