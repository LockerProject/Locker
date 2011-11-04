/* Generic log function for debugging. */
var log = function(msg) { if (console && console.log) console.debug(msg); }

/**
 * Reload the display (get places, render them)
 * @property offset {Integer} Optional Where in the places collection you want to start.
 * @property limit {Integer} Optional The number of places you want returned.
 * @property useJSON {Boolean} Optional Display raw JSON instead of the place's name.
 */
function reload(offset, limit, useJSON) {
    // set the params if not specified
    var offset = offset || 0;
    var limit = limit || 100;
    var useJSON = useJSON || false;

    var getPlacesCB = function(places) {
    places = places.sort(function(lh, rh) {
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
    console.log(places);
  // find the unordered list in our document to append to
        var placesList = $("#main ul");

  // clear the list
  placesList.html('');

  // populate the list with our places
  if (places.length == 0) placesList.append("<li>Sorry, no places found!</li>");
        for (var i in places) {
      place = places[i];

      log(place);
      if (useJSON) {

    placeHTML = "<pre>"+ JSON.stringify(place, null, 2) +"</pre>";
      } else {
    // get the place name, but use the first email address if no name exists
    placeHTML = place.name || place.emails[0].value;
      }
      liHTML = '<li id="' + place._id + '" class="place"><img src="/Me/places/image/' + place.id+ '" style="max-width:300px" /><span class="basic-data">'+placeHTML+'</span></div>';
      placesList.append(liHTML);
  }
    };

    $.getJSON(
  '/query/getPlace',
  {'offset':offset, 'limit':limit},
  getPlacesCB
    );
}

/* jQuery syntactic sugar for onDomReady */
$(function() {
    reload(0, 100, true);
});
