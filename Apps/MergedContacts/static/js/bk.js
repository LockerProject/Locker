
    var baseURL = 'http://localhost:8042/query';
    var data = {};
    var showing = {};



    /**
     * Adds a row to the contacts data table.
     * @param contact {Object} - Contact object
     */
    function addRow(contact) {
	data[contact._id] = contact;
	var contactsTable = $("#datatable #contacts");
	contactsTable.append('<div id="' + contact._id + '" class="contact"><span class="basic-data"></span></div>');
	var theNewDiv = $("#datatable #contacts #" + contact._id);
	var theDiv = theNewDiv.find('.basic-data');
	
	theDiv.click(function() {
            divClickHandler(contact._id);
	});
	
	addPhoto(theNewDiv, contact);
	addName(theDiv, contact);
	addEmail(theDiv, contact);
	addTwitter(theDiv, contact);
	contactsTable.append('<br>');
    }

    /**
     * Adds a photo or silhouette to the div
     * @param div {HTMLElement} - Element to apend to.
     * @param contact {Object} - Contact object
     */
    function addPhoto(div, contact) {
	var image_url = getPhotoUrl(contact, true);
	
	if(image_url)
            div.append('<span class="column photo"><img src="' + image_url + '"></span>');
	else
            div.append('<span class="column photo"><img src="img/silhouette.png"></span>');
    }

    /**
     * Get the depiction URL for a contact 
     * @param contact {Object} - contact obj
     * @param fullsize {Boolean} - does nothing
     */
    function getPhotoUrl(contact, fullsize) {
	var url = 'img/silhouette.png';
	if(contact.photos && contact.photos.length) {
            url = contact.photos[0];
            //twitter
            if(fullsize && url.match(/_normal\.(jpg||png)/) && !url.match(/.*default_profile_([0-9])_normal\.png/))
		url = url.replace(/_normal\.(jpg||png)/, '.$1');
            else if(url.indexOf('https://graph.facebook.com/') === 0) {
		if(fullsize)
                    url = url += "?return_ssl_resources=1&type=large";
		else
                    url = url += "?return_ssl_resources=1&type=square";
            }
	}
	return url;
    }

    /** 
     * Add the person's name to a div
     * @param div {HTMLElement} - Element to append to
     * @contact {Object} - Contact object
     */
    function addName(div, contact) {
	div.append('<span class="column name">' + (contact.name || '') + '</span>');
    }

    /**
     * Add the person's email to a div
     * @param div - $(HTMLElement)
     * @param contact - contact obj
     */
    function addEmail(div, contact) {
	var email;
	if(contact.emails && contact.emails.length)
            email = contact.emails[0].value;
	div.append('<span class="column email">' + (email || '&nbsp;') + '</span>');
    }

    /**
     * Add the person's twitter username to a div
     * @param div - $(HTMLElement)
     * @param contact - contact obj
     */
    function addTwitter(div, contact) {
	var twitterUsername;
	if(contact.accounts.twitter && contact.accounts.twitter[0].data 
           && contact.accounts.twitter[0].data.screen_name)
            twitterUsername = contact.accounts.twitter[0].data.screen_name;
	
	if(twitterUsername) {
            div.append('<span class="column twitter">' +
                       '<a target="_blank" href="https://twitter.com/' + twitterUsername + '">@' 
                       + twitterUsername + '</a></span>');
	} else
            div.append('<span class="column twitter"></span>');
    }

    /**
     * Add the person's GitHub details
     * @param div - $(HTMLElement)
     * @param contact - contact obj
     */
    function addGithub(div, contact) {
	var twitterUsername;
	div = $(div);

	if(contact.accounts.twitter && contact.accounts.twitter[0].data 
	   && contact.accounts.twitter[0].data.screen_name) {
            twitterUsername = contact.accounts.twitter[0].data.screen_name;
	}
	
	if(twitterUsername) {
            div.append('<span class="column twitter">' +
                       '<a target="_blank" href="https://twitter.com/' + twitterUsername + '">@' 
                       + twitterUsername + '</a></span>');
	} else
            div.append('<span class="column twitter"></span>');
    }

    /**
     * Add the person's Facebook details to a div
     * @param div {HTMLElement}
     * @param contact 
     */
    function addFacebook(div, contact) {
	div = $(div);
	var facebookUsername;
	if(contact.accounts.twitter && contact.accounts.twitter[0].data 
           && contact.accounts.twitter[0].data.screen_name)
            twitterUsername = contact.accounts.twitter[0].data.screen_name;
	
	if(twitterUsername) {
            div.append('<span class="column twitter">' +
                       '<a target="_blank" href="https://twitter.com/' + twitterUsername + '">@' 
                       + twitterUsername + '</a></span>');
	} else
            div.append('<span class="column twitter"></span>');
    }

    /**
     * get the location of a contact 
     * @param contact - contact obj
     */
    function getLocation(contact) {
	if(contact.addresses && contact.addresses) {
            for(var i in contact.addresses) {
		if(contact.addresses[i].type === 'location')
                    return contact.addresses[i].value;
            }
	}
	return '';
    }

    /**
     * Reload the display (get contacts, render them)
     * @param callback
     */
    function reload(callback) {
	var getContactsCB = function(contacts) {
            var contactsTable = $("#datatable #contacts");
            showing = {};
            contactsTable.html('');
            for(var i in contacts)
		addRow(contacts[i]);
            if(callback) callback();
	};
	getContacts(0, getContactsCB);
    }


    /**
     * Contact Click Handler
     * @param id 
     */
    function divClickHandler(id) {
	if(showing[id] === undefined) {
            var div = $("#datatable #contacts #" + id);
            div.append('<div class="more_info"></div>');
            var newDiv = $("#datatable #contacts #" + id + " .more_info");
            getMoreDiv(newDiv, data[id]);
            showing[id] = true;
	} else if(showing[id] === true) {
            var div = $("#datatable #contacts #" + id + " .more_info");
            div.hide();
            showing[id] = false;
	} else { //showing[id] === false
            var div = $("#datatable #contacts #" + id + " .more_info");
            div.show();
            showing[id] = true;
	}

    }

    /**
     * Get More Div
     * @param newDiv {HTMLElement} -
     * @param contact {Object} - Contact object
     **/
    var moreDiv = '<div.'
    function getMoreDiv(newDiv, contact) {
	var text = $("#more_blank").html();
	newDiv.addClass('more_info').append(text);
	newDiv.find('.pic').html('<img src=\'' + getPhotoUrl(contact, true) + '\'>');
	newDiv.find('.name_and_loc .realname').html(contact.name);
	newDiv.find('.name_and_loc .location').html(getLocation(contact));
	
	if(contact.accounts.twitter)
            addTwitterDetails(newDiv, contact.accounts.twitter[0]);    
	if(contact.accounts.github)
            addGithubDetails(newDiv, contact.accounts.github[0]);
	if(contact.accounts.facebook)
            addFacebookDetails(newDiv, contact.accounts.facebook[0]);    
	if(contact.accounts.foursquare)
            addFoursquareDetails(newDiv, contact.accounts.foursquare[0]);
    }

    /**
     * Add Twitter Details
     * @param newDiv {HTMLElement} -
     * @param twitter {Object} -
     */
    function addTwitterDetails(newDiv, twitter) {
	if(twitter && twitter.data) {
            newDiv.find('.twitter-details .username')
                .append('<a target="_blank" href="https://twitter.com/' + twitter.data.screen_name + '">@' + twitter.data.screen_name + '</a>');
            newDiv.find('.twitter-details .followers').append(twitter.data.followers_count);
            newDiv.find('.twitter-details .following').append(twitter.data.friends_count);
            newDiv.find('.twitter-details .tagline').append(twitter.data.description);
            newDiv.find('.twitter-details').css({display:'block'});
	}
    }

    /**
     * Add Github Details
     * @param newDiv {HTMLElement} -
     * @param twitter
     */
    function addGithubDetails(newDiv, github) {
	if(github && github.data) {
            newDiv.find('.github-details .login')
                .append('<a target="_blank" href="https://github.com/' + github.data.login + '">' + github.data.login + '</a>');
            newDiv.find('.github-details .followers').append(github.data.followers_count);
            newDiv.find('.github-details .following').append(github.data.following_count);
            newDiv.find('.github-details .repos').append(github.data.public_repo_count);
            newDiv.find('.github-details').css({display:'block'});
	}
    }
    /**
     * Add Facebook Details
     * @param newDiv {HTMLElement} -
     * @param fb - 
     */
    function addFacebookDetails(newDiv, fb) {
	var name = fb.data.name || (fb.data.first_name + ' ' + fb.data.last_name);
	if(fb && fb.data) {
            newDiv.find('.facebook-details .name')
                .append('<a target="_blank" href="https://facebook.com/profile.php?id=' + fb.data.id + '">' + name + '</a>');
            newDiv.find('.facebook-details').css({display:'block'});
	}
    }

    /**
     * Add Foursquare Details
     * @param newDiv {HTMLElement} - 
     * @param foursquare {Object} - 
     */
    function addFoursquareDetails(newDiv, foursquare) {
	var name = foursquare.data.name || (foursquare.data.firstName + ' ' + foursquare.data.lastName);
	if(foursquare && foursquare.data) {
            newDiv.find('.foursquare-details .name')
                .append('<a target="_blank" href="https://foursquare.com/user/' + foursquare.data.id + '">' + name + '</a>');
            newDiv.find('.foursquare-details .checkins').append(foursquare.data.checkins.count);
            newDiv.find('.foursquare-details .mayorships').append(foursquare.data.mayorships.count);
            newDiv.find('.foursquare-details').css({display:'block'});
	}
    }

    /** 
     * Show Full
     * @param id {String} - ID for the contact in the DOM you want to show off.
     */
    function showFull(id) {
	var div = $("#datatable #contacts #" + id);
	div.css({'height':'400px'});
	div.append('<div>' + JSON.stringify(data[id]) + '</div>');
    }


    reload();
    $('#query-text').keyup(function(key) {
        if(key.keyCode == 13)
            reload();
    });
