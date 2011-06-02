var baseURL = 'http://localhost:8042/query';
var data = {};

// function getContacts(queryText, skip, limit, sort, callback) {
function getContacts(skip, limit, callback) {
    // $.getJSON(baseURL + '/contacts', {text:queryText, skip:skip, limit:limit, sort:[sort]}, callback);
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
    // addKlout(theDiv, contact);
    // addDate(theDiv, contact);
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
// 
// function addGitHub(div, contact) {
//     var githubUsername;
//     if(contact.github && contact.github.data && contact.github.data.login)
//         githubUsername = contact.github.data.login;
//     else if(contact.rapportive && contact.rapportive.data && contact.rapportive.data.membership &&
//             contact.rapportive.data.membership.github && contact.rapportive.data.membership.github.username)
//         githubUsername = contact.rapportive.data.membership.github.username;
//     
//     if(githubUsername) {
//         div.append('<span class="column github">' +
//                          '<a target="_blank" href="https://github.com/' + githubUsername + '">' 
//                          + githubUsername + '</a></span>');
//     } else
//         div.append('<span class="column github"></span>');
// }
// 
// function addLinkedIn(div, contact) {
//     var linkedin, occupations;
//     if(contact.rapportive && contact.rapportive.data) {
//         if(contact.rapportive.data.memberships)
//             linkedin = contact.rapportive.data.memberships.linkedin;
//         if(contact.rapportive.data.occupations)
//             occupations = contact.rapportive.data.occupations;
//     }
//     if(linkedin) {
//         var linkText = '';
//         if(!occupations || occupations.length == 0) {
//             linkText = 'Profile';
//         } else if(occupations[0].job_title) {
//             linkText = occupations[0].job_title;
//             if(occupations[0].company)
//                 linkText += ' at ' + occupations[0].company;
//         } else if(occupations[0].company) {
//             linkText = occupations[0].company;
//         }
// //        console.log(linkText);
//         div.append('<span class="column linkedin">' +
//                          '<a target="_blank" href="' + linkedin.profile_url + '">' + linkText + '</a></span>');
//     } else
//         div.append('<span class="column linkedin"></span>');
// }
// 
// function addKlout(div, contact) {
//     var klout = contact.klout;
//     var score;
//     
//     if(klout && klout.data) {
//         if(klout.data.score && klout.data.score.kscore)
//             score = klout.data.score.kscore;
//     }
//     div.append('<span class="column klout">' + (score || '') + '</span>');
// }
// 
// function addDate(div, contact) {
//     var date = new Date().getTime();
//     var min = date;
//     if(contact.dates) {
//         var dates = contact.dates;
//         if(dates.rapportive && dates.rapportive.engaged)
//             min = Math.min(min, dates.rapportive.engaged);
//         if(dates.twitter && dates.twitter.engaged)
//             min = Math.min(min, dates.twitter.engaged);
//         if(dates.github && dates.github.engaged)
//             min = Math.min(min, dates.github.engaged);
//     }
//     if(min < date)
//         date = min;
//     else
//         date = null;
//     if(date) {
//         var d = new Date(date/1);
// //        console.log(d);
//         div.append('<span class="column date">' + (d.getMonth() + 1) + '/' + d.getDate() + '/' + (d.getFullYear() - 2000) + '</span>');
//     }
//     else
//         div.append('<span class="column date"></span>');
// }

function getLocation(contact) {
    if(contact.addresses && contact.addresses) {
        for(var i in contact.addresses) {
            if(contact.addresses[i].type === 'location')
                return contact.addresses[i].value;
        }
    }
    return '';
}

var sort = {'dates.rapportive.engaged':'desc', 
            'klout.data.score.kscore':'asc', 
            'rapportive.data.name':'desc', 
            'rapportive.data.email':'desc'};

var start = 0, end = 100, currentSort;

function reload(sortField, _start, _end, callback) {
    var usedSortField = getSort(sortField);
    console.log(usedSortField);
    console.log('_start _end:', _start, _end);
    start = _start || 0; end = _end || 100;
    var queryText = $('#query-text').val();
    // console.log(queryText);
    // getContacts(queryText, start, end - start, usedSortField, function(contacts) {
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
    newDiv.find('.name_and_loc .realname').html(getName(contact));
    newDiv.find('.name_and_loc .location').html(getLocation(contact));
    // if(contact.rapportive && contact.rapportive.data) {
    //     console.log(contact.rapportive.data.occupations);
    //     var occs = contact.rapportive.data.occupations;
    //     for(var i in occs)
    //         newDiv.find('.jobs').append(occs[i].job_title + ' at ' + occs[i].company + (i < occs.length - 1? "<br>" :""));
    //         
    //     var followingDiv = newDiv.find('.right_side .following')
    //     console.log(contact.dates.rapportive.engaged);
    //         if(contact.dates.rapportive && contact.dates.rapportive.engaged > 1)
    //             followingDiv.find('.emaillist').css({display:'inline'});
    // }
    
    if(contact.accounts.twitter)
        addTwitterDetails(newDiv, contact.accounts.twitter[0]);
    // addGithubDetails(newDiv, contact.github);
    // addBlogDetails(newDiv, contact);
    
    addTags(contact._id, contact.tags);
    
    $('#contacts #' + contact._id + ' .more_info .right_side .add-tag').keyup(function(key) {
        if(key.keyCode == 13) {
            doTag(contact._id);
        }
        console.log(key.keyCode);
    });

    var notesForm = $('#contacts #' + contact._id + ' .notes .notes-form');
    if(contact.notes)
        notesForm.find('.notes-text').val(contact.notes);
    console.log(notesForm.html());
    notesForm.find('.update-notes').click(function() {
        var notes = notesForm.find('.notes-text').val();
        console.log(notes);
        setNotes(contact._id, notes);
    });
}

function addTwitterDetails(newDiv, twitter) {
    if(twitter && twitter.data) {
        newDiv.find('.twitter-details .username')
                 .append('<a target="_blank" href="http://twitter.com/' + twitter.data.screen_name + '">@' + twitter.data.screen_name + '</a>');
        newDiv.find('.twitter-details .followers').append(twitter.data.followers_count);
        newDiv.find('.twitter-details .following').append(twitter.data.friends_count);
        newDiv.find('.twitter-details .tagline').append(twitter.data.description);
        
        var followingDiv = newDiv.find('.right_side .following')
        for(var i in twitter.following) {
            var who = twitter.following[i];
            console.log(who);
            if(who == 'lockerproject')
                followingDiv.find('.tw-tlp').css({display:'inline'});
            else if(who == 'singlyinc')
                followingDiv.find('.tw-singly').css({display:'inline'});
        }
        console.log(twitter);
    } else {
        newDiv.find('.twitter-details').css({display:'none'});
    }
}
// 
// function addBlogDetails(newDiv, contact) {
//     var blogUrl;
//     if(contact.twitter && contact.twitter.data && contact.twitter.data.url) {
//         blogUrl = contact.twitter.data.url;
//     } else if(contact.github && contact.github.data && contact.github.data.blog) {
//         blogUrl = contact.github.data.blog;
//     }
//     if(blogUrl) {
//         console.log('found blogUrl:', blogUrl);
//         newDiv.find('.blog-details').append('<a target="_blank" href="' + blogUrl + '">' + blogUrl + '</a>');
//     } else {
//         newDiv.find('.blog-details').css({display:'none'});
//     }
//     console.log('contact:', contact);
// }

function addTags(id, tags) {
    if(!tags)
        return;
    tags.forEach(function(tag) {
        appendTag(id, tag);
    });
}

function appendTag(id, tag) {
    var tagsDiv = $("#table #contacts #" + id + ' .tags');
    tagsDiv.append('<span><span class=\'tag-val\'>' + tag + '</span>&nbsp;&nbsp;<a href="#" onclick="javascript:dropTag(\'' + id + '\',\'' + tag + '\');">x</a></span>');
}
function clearTag(id, tag) {
    $("#table #contacts #" + id + ' .tags .tag-val').each(function(index) {
        console.log($(this).html());
        if($(this).html() == tag) {
            $(this).parent().remove();
        }
    });
}

function showFull(id) {
    console.log(id);
    var div = $("#table #contacts #" + id);
    div.css({'height':'400px'});
    div.append('<div>' + JSON.stringify(data[id]) + '</div>');
}


function doTag(id) {
    var tag = $('#contacts #' + id + ' .more_info .right_side .add-tag').val();
    addTag(id, tag);
}

// function addTag(id, tag) {
//     $.get(baseURL + '/tags/add', {id:id, tag:tag}, function(data) {
//         appendTag(id, tag);
//         $("#table #contacts #" + id + ' .tags .add-tag').val('');
//         console.log(data);
//     });
// }
// 
// function dropTag(id, tag) {
//     $.get(baseURL + '/tags/drop', {id:id, tag:tag}, function(data) {
//         clearTag(id, tag);
//         $("#table #contacts #" + id + ' .tags .add-tag').val('');
//         console.log(data);
//     });
// }
// 
// function setNotes(id, notes) {
//     $.post(baseURL + '/update/notes', {id:id, notes:notes}, function(data) {
// //        appendTag(id, tag);
//         $("#table #contacts #" + id + ' .tags .add-tag').val('');
//         console.log(data);
//     });
// }

$(function() {
    console.log('heeeelooo, jquery!');
    reload('dates.rapportive.engaged', start, end);
    $('#query-text').keyup(function(key) {
        if(key.keyCode == 13)
            reload();
    });
});
