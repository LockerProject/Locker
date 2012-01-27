/* Generic log function for debugging. */
var log = function(msg) { if (console && console.log) console.debug(msg); }
window.onload = loadScript;

var markers = [];
var map;

function getLatestPlace() {
    $.getJSON(
        '/Me/places',
        {'offset':0, 'limit':1, 'sort': 'at', 'order': -1},
        initializeMap
    );
}

function initializeMap(place) {
    var myLat = place[0].lat || 37.759;
    var myLng = place[0].lng || -122.410;
    var mySource = place[0].network || undefined;
    
    if (place[0].at){
        date = new Date(place[0].at);
        var myTitle = date.toLocaleString();
    }
    else{
        var myTitle = "Singly HQ";
    }
    
    var myOptions = {
        zoom: 12,
        center: new google.maps.LatLng(myLat, myLng),
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    console.log(place);

    map = new google.maps.Map(document.getElementById('mapcanvas'), myOptions);
    addMarker(myLat, myLng, myTitle, mySource);
    
}


function loadPlaceslist(offset, limit) {
    // set the params if not specified
    var offset = offset || 0;
    var limit = limit || 100;
    var useJSON = useJSON || false;

    var getPlacesCB = function(places) {
        // find the unordered list in our document to append to
        var $placeslist = $("#placeslist");
        $placeslist.html('');

        if (places.length === 0) $placeslist.append("<li>Sorry, no places found!</li>");
        for (var i in places) {
            place = places[i];
            if (place.network === 'foursquare' && place.from === 'Me') {
                // places collection adds two records for your checkin, in checkins and in recents.  This filters out the former.
                continue;
            }
            var atSeparator = ' @ ';
            if (place.network === 'glatitude' || !place.title) {
                var atSeparator = '';
            }
            $placeslist.append('<li class="place"><a class="placelink" href="#" data-id="' + place._id + '" data-me="' + place.me +
                               '" data-network="' + place.network + '" data-path="' + place.path + '" data-lat="' + place.lat +
                               '" data-lng="' + place.lng + '" data-title="' + place.title + '"><div class="filler"><img class="network" src="/Me/helloplaces/static/img/' +
                               place.network + '.png" /><div class="title">' + place.from + atSeparator + place.title + '</div><div class="date">' + moment(place.at).format('h:mma') +
                               ' on ' + moment(place.at).format('M/D/YYYY') + '</div></div></a></li>');
        }
    };

    $.getJSON(
        '/Me/places',
        {'offset':offset, 'limit':limit, 'sort': 'at', 'order': -1},
        getPlacesCB
    );
}

function addMarker(lat, lng, title, network) {
    var markerObj = {
                    position: new google.maps.LatLng(lat, lng),
                    map: map,
                    draggable: false,
                    animation: google.maps.Animation.DROP,
                    title:title
                 };
    if (network !== undefined) {
     markerObj.icon = '/Me/helloplaces/static/img/' + network + '-marker.png';
    }

    var marker = new google.maps.Marker(markerObj);
    markers.push(marker);
}

function clearOverlays() {
  if (markers) {
    for (var i in markers) {
      markers[i].setMap(null);
    }
    markers.length = 0;
  }
}


function loadScript() {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://maps.googleapis.com/maps/api/js?sensor=false&callback=getLatestPlace';
    document.body.appendChild(script);
}


$(function() {
    loadPlaceslist(0, 1000); // get infinite scroll working here

    $(".placelink").live('click', function(e) {
        e.preventDefault();
        clearOverlays();
        var lat = $(this).attr('data-lat');
        var lng = $(this).attr('data-lng');
        addMarker(lat, lng, $(this).attr('data-title'), $(this).attr('data-network'));
        map.panTo(new google.maps.LatLng(lat, lng));
        //console.log(lat);
        //console.log(lng);
    });
});