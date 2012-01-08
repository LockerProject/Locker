/* Generic log function for debugging. */
var log = function(msg) { if (console && console.log) console.debug(msg); }

/**
 * Reload the display (get checkins, render them)
 * @property useJSON {Boolean} Optional Display raw JSON instead of the checkin's name.
 */

var map;
var markersArray = [];

function add_marker(checkin, html, open) {
    
    var myLatlng = new google.maps.LatLng(checkin.venue.location.lat, checkin.venue.location.lng);
    
    var icon = "https://foursquare.com/img/categories/building/home.png";
    if (checkin.hasOwnProperty('venue') && checkin.venue.hasOwnProperty('categories') && checkin.venue.categories.length >0 && checkin.venue.categories[0].hasOwnProperty('icon')){
        icon =  checkin.venue.categories[0].icon;
    }

    var marker = new google.maps.Marker({
        position: myLatlng, 
        map: map,
        icon: icon
    });

    var infowindow = new google.maps.InfoWindow({
          content: html
    });
      
    google.maps.event.addListener(marker, 'click', function() {
          infowindow.open(map,marker);
    });

    if (open == true){
	    infowindow.open(map,marker);
    }
    markersArray.push(marker);
}

function clearOverlays() {
  if (markersArray) {
    for (i in markersArray) {
      markersArray[i].setMap(null);
    }
  }
}

function initialize() {

    var latlng = new google.maps.LatLng(0, 0);
    var myOptions = {
      zoom: 2,
      center: latlng,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(document.getElementById("map_canvas"),
        myOptions);
}

function sortObj(arr){
    // Setup Arrays
    var sortedKeys = new Array();
    var sortedObj = {};
 
    // Separate keys and sort them
    for (var i in arr){
        sortedKeys.push(i);
    }

    sortedKeys.sort();
 
    // Reconstruct sorted obj based on keys
    for (var i in sortedKeys){
        sortedObj[sortedKeys[i]] = arr[sortedKeys[i]];
    }

    return sortedObj;
}

function update_map(checkins) {

    var latlng = new google.maps.LatLng(0,0);
    var latlng_set = false;

    var checkinsList = $("#main ul");
	checkinsList.html('');
    
    $.each(checkins, function(name, checkin) {
        var icon = "";

        if (checkin.venue.categories.length > 0 && checkin.venue.categories[0].hasOwnProperty('icon')) {
            // setup the icon link for the marker to use instead of dull google maps one
            for (var i in checkin.venue.categories) {
                icon += '<img src="' + checkin.venue.categories[i].icon + '"/>';
            }
        }

        var city = checkin.venue.location.city ? ' - ' + checkin.venue.location.city : '';

        if (icon != undefined) {
            liHTML = '<li id="' + checkin._id + '" class="checkin"><span class="basic-data">' + '<h2><a href="https://foursquare.com/venue/' + checkin.venue.id + '">' + checkin.venue.name +'</a>' + city +'</h2>';
        } else {
            liHTML = '<li id="' + checkin._id + '" class="checkin"><span class="basic-data"><h2><a href="https://foursquare.com/venue/' + checkin.venue.id + '">' + checkin.venue.name +'</a>' + city +'</h2>';
        }

        liHTML +='<p>You checked in at ' + new Date(checkin.createdAt * 1000);

        if (checkin.isMayor == true){
            liHTML += ' and you are mayor!';
        }

        liHTML +='</p></span></div>';

        // this is the html snippet that will be displyed when the marker is clicked
        // in the info bubble
        var html = "";
        if (icon != undefined) {
            html += icon;
        }

        html += '<h1><a href="https://foursquare.com/venue/' + checkin.venue.id + '">' + checkin.venue.name +'</a>' + "</h1>";

        if (checkin.venue.categories.length > 0) {
            html += "<p>" + checkin.venue.categories[0].name + '.</p>';
        }

        html += '<ul><li>Last Visited: '  + new Date(checkin.createdAt * 1000) +'</li>';
        html += '<li>Total Check-Ins: ' + checkin.venue.stats.checkinsCount + '</li>';
        html += '<li>Total People: ' + checkin.venue.stats.usersCount + '</li>';
        html += '</ul>';
    
        // add the marker to the map with our html, the false means the info bubble will be closed
        add_marker(checkin, html, false);

        if (checkin.venue.location.hasOwnProperty('lat') && checkin.venue.location.hasOwnProperty('lat') && latlng_set == false ){
            latlng = new google.maps.LatLng(checkin.venue.location.lat, checkin.venue.location.lng);
            map.setZoom(10);
            map.setCenter(latlng);
            latlng_set = true;
        }
        checkinsList.append(liHTML);
    });

} // update_map

function reload(useJSON, day) {
    // set the params if not specified
    var useJSON = useJSON || false;
    var getcheckinsCB = function(checkins) {
	// find the unordered list in our document to append to
    var checkinsList = $("#main ul");

	checkinsList.html('');

    if (day != undefined) {
        var valid_checkins = [];
        clearOverlays();
        if (checkins.length == 0) {
            checkinsList.append("<li>Sorry, no checkins found!</li>");
        } else {
            for (var i in checkins) {
                var checkin = checkins[i];
                var checkedin = new Date(checkin.createdAt * 1000);
                var formatted_date = $.datepicker.formatDate( 'mm/dd/yy', checkedin);
                if (formatted_date == day) {
                    valid_checkins.push(checkin);
                }//if
    	    }//for   
            if (valid_checkins.length == 0) {
                checkinsList.append("<li>Sorry, no checkins found!</li>");
            } else {
                update_map(valid_checkins);
            }//else
        }
    } else {

    	// clear the list
	    var checkins_visited = {};

        // populate the list with our checkins
    	if (checkins.length == 0) checkinsList.append("<li>Sorry, no checkins found!</li>");
            for (var i in checkins) {
	            checkin = checkins[i];
                if (checkin.hasOwnProperty('venue')){
                    checkins_visited[checkin.venue.name] = checkin;
                }
	        }

            checkins_visited = sortObj(checkins_visited);
            update_map(checkins_visited);

    }//else
    };

    $.getJSON(
	'/Me/foursquare/getCurrent/checkin',
	{}, 
	getcheckinsCB
    );
}

/* jQuery syntactic sugar for onDomReady */
$(function() {
    reload(true);
    $('#datepicker').datepicker({
        onSelect: function(dateText, inst) { 
        	reload(true, dateText);
        }
    });
});
