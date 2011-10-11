/* Generic log function for debugging. */
var log = function(msg) { if (console && console.log) console.debug(msg); };

function photoApp() {
    // set the params if not specified
    var offset = 0;
    var limit = 50;
    var $photosList = $("#main");

    var timeSort = function(lh, rh) {
                var rhc = parseInt(rh.timestamp);
                var lhc = parseInt(lh.timestamp);
                //log(rhc);
                //log(lhc);
                if (isNaN(rhc) || isNaN(lhc)) {
                    console.dir(rh);
                    console.dir(lh);
                }
                if (rhc > (Date.now() / 1000)) rhc = rhc / 1000;
                if (lhc > (Date.now() / 1000)) lhc = lhc / 1000;
                return rhc - lhc;
    };

    var HTMLFromPhotoJSON = function(photos) {
        var p, title, photoHTML = "";
        // removed for the time being, the query should return time sorted data
        // photos = photos.sort(timeSort);
        for (var i in photos) {
      p = photos[i];
      title = p.title ? p.title : "Unititled";
      photoHTML += '<div class="box"><div id="' + p._id + '" class="photo"><img src="/Me/photos/image/' + p.id+ '" style="max-width:300px" /><div class="basic-data">'+title+'</div></div></div>';
  }
        return photoHTML;
    };

    var getPhotosCB = function(photos) {
        var p, title, photoHTML = "";

  // clear the list
  $photosList.html('');

  // populate the list with our photos
  if (photos.length == 0) $photosList.append("<div>Sorry, no photos found!</div>");

  $photosList.append(HTMLFromPhotoJSON(photos));

        $photosList.imagesLoaded(
            function(){
                $photosList.masonry(
                    {
                        itemSelector : '.photo'
                    });
            });
        offset += photos.length;
    };

    var getMorePhotosCB = function(photos) {
        var $newElems;
        if (photos.length == 0) return;

  $newElems = $(HTMLFromPhotoJSON(photos));
        $photosList.append($newElems);

        // ensure that images load before adding to masonry layout
        $newElems.imagesLoaded(
            function(){
                $photosList.masonry( 'appended', $newElems, true );
            });
        offset += limit;
    };

    var sort = '\'{"timestamp":-1}\'';

    var loadMorePhotosHandler = function() {
        $.getJSON(
      '/query/getPhoto',
      {
                'offset':offset,
                'limit':limit,
                'sort':sort
            },
            getMorePhotosCB
        );

    };

    // init
    $.getJSON(
  '/query/getPhoto',
  {
            'offset':offset,
            'limit':limit,
            'sort':sort
    },
  getPhotosCB
    );

    $("#moarphotos").click( loadMorePhotosHandler );

    // TODO: make this keep in sync!
}

/* jQuery syntactic sugar for onDomReady */
$(function() {
      var photos = photoApp();
});
