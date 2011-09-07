/* Generic log function for debugging. */
var log = function(msg) { if (console && console.log) console.debug(msg); };

/**
 * Reload the display (get contacts, render them)
 * @property offset {Integer} Optional Where in the contacts collection you want to start.
 * @property limit {Integer} Optional The number of contacts you want returned.
 * @property useJSON {Boolean} Optional Display raw JSON instead of the contact's name.
 */

var map, geocoder;

function add_marker(checkin, icon, html, open) {
    var myLatlng = new google.maps.LatLng(checkin.location.lat, checkin.location.lng);

    var image = new google.maps.MarkerImage(icon, new google.maps.Size(50, 50), new google.maps.Point(0,0), new google.maps.Point(0, 0));

    var marker = new google.maps.Marker({
        position: myLatlng, 
        map: map,
        icon: image
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
    geocoder = new google.maps.Geocoder();
    var latlng = new google.maps.LatLng(-34.397, 150.644);
    var myOptions = {
      zoom:2,
      center: latlng,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
}

function codeAddress() {
    var address = document.getElementById("address").value;
    geocoder.geocode( { 'address': address}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        map.setCenter(results[0].geometry.location);
      } else {
        alert("Geocode was not successful for the following reason: " + status);
      }
    });
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
                    var mayorship, contactHTML, liHTML;                    

                    if (friend.mayorships.count != 0) {
                        for (var i in friend.mayorships.items){
                            mayorship = friend.mayorships.items[i];
                            var html = "";
                            if (mayorship.categories.length > 0) {
                                html = "<h1><img src='" + mayorship.categories[0].icon + "' style='height: 50px; width: 50px;'/>" + mayorship.name + "</h1>";
                            } else {
                                html = "<h1>" + mayorship.name + "</h1>";
                            }
                            
                            if (typeof(contact.photos) != "undefined" && contact.photos[0]) {
                                add_marker(mayorship, contact.photos[0], html, false);
                            }
                            lastlat = mayorship.location.lat;
                            lastlng = mayorship.location.lng;
                        }
                        contactHTML = contact.name || contact.emails[0].value;
                        
                        var lastname = friend.lastName ? friend.lastName : '';
                        liHTML = '<li id="' + contact._id + '" class="contact">' + friend.firstName + ' ' + lastname + '<br/><span class="basic-data">';
                        for (var i in friend.mayorships.items){
                        mayorship = friend.mayorships.items[i];
                            liHTML += ' - <a href="https://foursquare.com/venue/' + mayorship.id + '">' + mayorship.name + '</a>';
                        }
                        liHTML += '</span></div>';
                        contactsList.append(liHTML);
                    }
                }
            }
            var latlng = new google.maps.LatLng(lastlat, lastlng);
            map.setCenter(latlng);
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
      $("input[type=submit]").click(codeAddress);
});
