var baseURL = 'http://localhost:8042/query';
var data = {};

function getContacts(skip, limit, callback) {
    console.log(baseURL + '/getAcontacts_contacts'); //
    $.getJSON(baseURL + '/getAcontacts_contacts', {offset:skip, limit:100}, callback);
}

function addRow(contact) {
    console.log('adding contact:', contact);
    data[contact._id] = contact;
    var contactsTable = $("#table #contacts");
    contactsTable.append('<div id="' + contact._id + '" class="contact"><span class="basic-data"></span></div>');
    var theNewDiv = $("#table #contacts #" + contact._id);
    var theDiv = theNewDiv.find('.basic-data');
    theDiv.click(function() {
        divClicked(contact._id);
    });
    addPhoto(theNewDiv, contact);
    addName(theDiv, contact);
    addEmail(theDiv, contact);
    addTwitter(theDiv, contact);
    // addLinkedIn(theDiv, contact);
    // addGitHub(theDiv, contact);
    contactsTable.append('<br>');
}

function addPhoto(div, contact) {
    var image_url = getPhotoUrl(contact);
    if(image_url)
        div.append('<span class="column photo"><img src="' + image_url + '"></span>');
    else
        div.append('<span class="column photo"><img src="img/silhouette.png"></span>');
}

function getPhotoUrl(contact, fullsize) {
    if(contact.photos && contact.photos.length)
        return contact.photos[0];
    return 'img/silhouette.png';
}

function addName(div, contact) {
    div.append('<span class="column name">' + (contact.name || '') + '</span>');
}

function addEmail(div, contact) {
    var email;
    if(contact.emails && contact.emails.length)
        email = contact.emails[0].value;
    div.append('<span class="column email">' + (email || '&nbsp;') + '</span>');
}

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

function addFacebook(div, contact) {
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

function getLocation(contact) {
    if(contact.addresses && contact.addresses) {
        for(var i in contact.addresses) {
            if(contact.addresses[i].type === 'location')
                return contact.addresses[i].value;
        }
    }
    return '';
}

var sort = {};

var start = 0, end = 100, currentSort;

function reload(sortField, _start, _end, callback) {
    var usedSortField = getSort(sortField);
    console.log(usedSortField);
    console.log('_start _end:', _start, _end);
    start = _start || 0; end = _end || 100;
    var queryText = $('#query-text').val();
    getContacts(start, end - start, function(contacts) {
       console.log('contacts',contacts);
        // console.log(contacts.length);
        var contactsTable = $("#table #contacts");
        if(start == 0 || sortField) {
            showing = {};
            contactsTable.html('');
        }
        for(var i in contacts)
            addRow(contacts[i]);
        if(callback) callback();
    });
}


function getSort(sortField) {
    if(sortField) {
        var direction = 'asc';
        if(sort[sortField]) {
            if(sort[sortField] == 'asc') 
                direction = 'desc';
            else
                direction = 'asc';
        }
        sort[sortField] = direction;
        currentSort = [sortField, direction];
    }
    return currentSort;
}

function loadMore(callback) {
    console.log('loading maaawr!!!');
    start = end;
    end += 100;
    reload(null, start, end, function() {
        if(callback) callback();
    });
}

var showing = {};
function divClicked(id) {
    console.log(id);
    if(showing[id] === undefined) {
        var div = $("#table #contacts #" + id);
        div.append('<div class="more_info"></div>');
        var newDiv = $("#table #contacts #" + id + " .more_info");
        getMoreDiv(newDiv, data[id]);
        showing[id] = true;
    } else if(showing[id] === true) {
        var div = $("#table #contacts #" + id + " .more_info");
        div.hide();
        showing[id] = false;
    } else { //showing[id] === false
        var div = $("#table #contacts #" + id + " .more_info");
        div.show();
        showing[id] = true;
    }
}

var moreDiv = '<div.'
function getMoreDiv(newDiv, contact) {
    var text = $("#more_blank").html();
    newDiv.addClass('more_info').append(text);
    newDiv.find('.pic').html('<img src=\'' + getPhotoUrl(contact, true) + '\'>');
    newDiv.find('.name_and_loc .realname').html(contact.name);
    newDiv.find('.name_and_loc .location').html(getLocation(contact));
    
    if(contact.accounts.twitter)
        addTwitterDetails(newDiv, contact.accounts.twitter[0]);
    if(contact.accounts.facebook)
        addFacebookDetails(newDiv, contact.accounts.facebook[0]);    
    if(contact.accounts.foursquare)
        addFoursquareDetails(newDiv, contact.accounts.foursquare[0]);
    // addGithubDetails(newDiv, contact.github);
    // addBlogDetails(newDiv, contact);
    
    // addTags(contact._id, contact.tags);
        // 
        // $('#contacts #' + contact._id + ' .more_info .right_side .add-tag').keyup(function(key) {
        //     if(key.keyCode == 13) {
        //         doTag(contact._id);
        //     }
        //     console.log(key.keyCode);
        // });
    // 
    // var notesForm = $('#contacts #' + contact._id + ' .notes .notes-form');
    // if(contact.notes)
    //     notesForm.find('.notes-text').val(contact.notes);
    // console.log(notesForm.html());
    // notesForm.find('.update-notes').click(function() {
    //     var notes = notesForm.find('.notes-text').val();
    //     console.log(notes);
    //     setNotes(contact._id, notes);
    // });
}

function addTwitterDetails(newDiv, twitter) {
    console.log('twitter:', twitter);
    if(twitter && twitter.data) {
        newDiv.find('.twitter-details .username')
                 .append('<a target="_blank" href="https://twitter.com/' + twitter.data.screen_name + '">@' + twitter.data.screen_name + '</a>');
        newDiv.find('.twitter-details .followers').append(twitter.data.followers_count);
        newDiv.find('.twitter-details .following').append(twitter.data.friends_count);
        newDiv.find('.twitter-details .tagline').append(twitter.data.description);
        newDiv.find('.twitter-details').css({display:'block'});
    }
}

function addFacebookDetails(newDiv, fb) {
    console.log('fb:', fb);
    var name = fb.data.name || (fb.data.first_name + ' ' + fb.data.last_name);
    if(fb && fb.data) {
        newDiv.find('.facebook-details .name')
                 .append('<a target="_blank" href="https://facebook.com/profile.php?id=' + fb.data.id + '">' + name + '</a>');
        newDiv.find('.facebook-details').css({display:'block'});
    }
}

function addFoursquareDetails(newDiv, foursquare) {
    console.log('foursquare:', foursquare);
    var name = foursquare.data.name || (foursquare.data.firstName + ' ' + foursquare.data.lastName);
    console.log('foursquare.name:', name);
    if(foursquare && foursquare.data) {
        newDiv.find('.foursquare-details .name')
                 .append('<a target="_blank" href="https://foursquare.com/user/' + foursquare.data.id + '">' + name + '</a>');
        newDiv.find('.foursquare-details .checkins').append(foursquare.data.checkins.count);
        newDiv.find('.foursquare-details .mayorships').append(foursquare.data.mayorships.count);
        newDiv.find('.foursquare-details').css({display:'block'});
    }
}

function showFull(id) {
    console.log(id);
    var div = $("#table #contacts #" + id);
    div.css({'height':'400px'});
    div.append('<div>' + JSON.stringify(data[id]) + '</div>');
}


$(function() {
    reload('dates.rapportive.engaged', start, end);
    $('#query-text').keyup(function(key) {
        if(key.keyCode == 13)
            reload();
    });
});
