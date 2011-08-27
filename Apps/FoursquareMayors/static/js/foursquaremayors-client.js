/* Generic log function for debugging. */
var log = function(msg) { if (console && console.log) console.debug(msg); }

/**
 * Reload the display (get contacts, render them)
 * @property offset {Integer} Optional Where in the contacts collection you want to start.
 * @property limit {Integer} Optional The number of contacts you want returned.
 * @property useJSON {Boolean} Optional Display raw JSON instead of the contact's name.
 */

var map;

function add_marker(checkin, icon, html, open) {

    var myLatlng = new google.maps.LatLng(checkin.location.lat, checkin.location.lng);

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
    map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
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

    //console.error(contacts.accounts);
	// populate the list with our contacts
	if (contacts.length == 0) { 
        contactsList.append("<li>Sorry, no contacts found!</li>");
    } else {
        for (var i in contacts) {
            var contact = contacts[i];
            var lastlat = 37.062530517578;
            var lastlng = 15.296230316162;
            if (contact.accounts.foursquare != undefined){
                var friend = contact.accounts.foursquare[0].data;
                
                if (friend.mayorships.count != 0) {
                    for (var i in friend.mayorships.items){
                        mayorship = friend.mayorships.items[i];
                        var html = ""
                        if (mayorship.categories.length > 0) {
                            html = "<h1><img src='" + mayorship.categories[0].icon + "'/> " + mayorship.name + "</h1>";
                        } else {
                            html = "<h1>" + mayorship.name + "</h1>";
                        }
                        
                        add_marker(mayorship, contact.accounts.foursquare[0].data.photo, html, false);
                        lastlat = mayorship.location.lat;
                        lastlng = mayorship.location.lng;
                    }
                    if (useJSON) {
                        contactHTML = "<pre>"+ JSON.stringify(contact.accounts.foursquare[0].data.mayorships.items[0], null, 2) +"</pre>";
                    } else {
                        // get the contact name, but use the first email address if no name exists
                        contactHTML = contact.name || contact.emails[0].value;
                    }
                    
                    var lastname = friend.lastName ? friend.lastName : '';
                    liHTML = '<li id="' + contact._id + '" class="contact"><h1>' + friend.firstName + ' ' + lastname + '</h1><span class="basic-data">'
                    for (var i in friend.mayorships.items){
                        mayorship = friend.mayorships.items[i];
                        liHTML += '<h2><a href="https://foursquare.com/venue/' + mayorship.id + '">' + mayorship.name + '</a></h2>';
                    }
                    liHTML += '</span></div>';
                    contactsList.append(liHTML);
                }
            }
        }
        var latlng = new google.maps.LatLng(lastlat, lastlng);
        map.setCenter(latlng)
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
