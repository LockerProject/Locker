/* Generic log function for debugging. */
var log = function(msg) { if (console && console.log) console.debug(msg); }

/**
 * Reload the display (get contacts, render them)
 * @property offset {Integer} Optional Where in the contacts collection you want to start.
 * @property limit {Integer} Optional The number of contacts you want returned.
 * @property useJSON {Boolean} Optional Display raw JSON instead of the contact's name.
 */

var map;

function add_marker(lat, loong, html, open, icon) {
      var myLatlng = new google.maps.LatLng(lat,loong);
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
}

function initialize() {
    var latlng = new google.maps.LatLng(37.062530517578, 15.296230316162);
    var myOptions = {
      zoom: 8,
      center: latlng,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(document.getElementById("map_canvas"),
        myOptions);
}

function reload(offset, limit, useJSON) {
    // set the params if not specified
    var offset = offset || 0; 
    var limit = limit || 100;
    var useJSON = useJSON || false;

    var getContactsCB = function(contacts) {
	// find the unordered list in our document to append to
        var contactsList = $("#main ul");

	// clear the list
	contactsList.html('');
	
	// populate the list with our contacts
	if (contacts.length == 0) contactsList.append("<li>Sorry, no contacts found!</li>");
        for (var i in contacts) {

	    contact = contacts[i];

        if (contact['accounts']['foursquare'][0]['data']['mayorships']['count'] != 0) {

	        log(contact);
            for (var i in contact['accounts']['foursquare'][0]['data']['mayorships']['items']){
                    mayorship = contact['accounts']['foursquare'][0]['data']['mayorships']['items'][i];
            add_marker(mayorship['location']['lat'],
                mayorship['location']['lng'],
                "<h1>" + mayorship['name'] +  "</h1>",
                false,
                contact['accounts']['foursquare'][0]['data']['photo']
            );
            }
    	    if (useJSON) {
        		contactHTML = "<pre>"+ JSON.stringify(contact['accounts']['foursquare'][0], null, 2) +"</pre>";
    	    } else {
    		// get the contact name, but use the first email address if no name exists
        		contactHTML = contact.name || contact.emails[0].value;
    	    }
    	    liHTML = '<li id="' + contact._id + '" class="contact"><span class="basic-data">'+contactHTML+'</span></div>';
    	    contactsList.append(liHTML);
        }
	    }
    };

    $.getJSON(
	'/query/getContact',
	{'offset':offset, 'limit':limit}, 
	getContactsCB
    );
}

/* jQuery syntactic sugar for onDomReady */
$(function() {
    reload(0, 9000, true);
});
