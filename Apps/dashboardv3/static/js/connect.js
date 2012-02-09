var profileTimeout;
var hasTwitterOrFacebook = false;

$(function() {
    // a guard in case any other pages (like develop) load this JS file
    if (window.parent.location.hash === '#Explore-connect') {
        $('.nav-section', window.parent.document).fadeOut();
    }

    $(".oauthLink.action-button").click(function(e) {
        e.preventDefault();
        showHiddenConnectors();
    });

    $('body').delegate('.oauthLink','click', Locker.connectService);

    //updateIfConnected();

    $('#start-exploring-link').click(function(e) {
        e.preventDefault();
        parent.window.location.replace('/');
    });

    $('.synclets-list li input').each(function(index, item) {
        var that = $(this);
        if (that.attr('data-provider') === 'twitter' || that.attr('data-provider') === 'facebook') {
            that.parent().fadeIn();
            hasTwitterOrFacebook = true;
        }
    });

    $('.learnmore-link').click(function(e) {
      if ($('.learnmore-copy').is(":hidden")) {
        $(this).hide();
        $(this).html('Close section');
        $(this).fadeIn('fast');
        $('.learnmore-copy').slideToggle('fast');
      } else {
        $(this).hide();
        $(this).html('Learn more about what we do');
        $(this).fadeIn('fast');
        $('.learnmore-copy').slideToggle('fast');
      }
    });

    // if apikeys doesn't have twitter/facebook, just show everything
    if (hasTwitterOrFacebook === false) {
        showAllConnectors();
    }
});

// this one is called only when going through a first-time connection
var syncletInstalled = function(provider) {
    $('.oauthLink').each(function(index) {
        if ($(this).attr('data-provider') === provider) {
            $(this).removeClass('oauthLink');
            $(this).addClass('disabled');
            $(this).val('Connected');
        }
    });

    $('.sidenav-items.synclets.connect', window.parent.document).append("<img src='img/icons/32px/"+provider+".png'>");
    showHeaderTwo();
    showAllConnectors();
    updateUserProfile();
};

var showHiddenConnectors = function() {
    showHeaderTwo();
    $(".hideable").fadeIn();
};

var showAllConnectors = function() {
    $(".synclets-list li").fadeIn();
};

var showHeaderOne = function() {
    if ($("#main-header-2").is(":visible")) {
        $("#main-header-2").hide();
        $("#main-header-1").show();
    }
};

var showHeaderTwo = function() {
    $('.nav-section', window.parent.document).fadeIn();

    if ($("#main-header-1").is(":visible")) {
        $("#main-header-1").hide();
        $("#main-header-2").show();
    }
};

/*
var updateIfConnected = function() {
    if ($('.sidenav-items.synclets.connect img', window.parent.document).length === 0) {
        $('.nav-section', window.parent.document).fadeOut();
    } else {
        $('.nav-section', window.parent.document).fadeIn();
        showAllConnectors();
    }
}*/


var updateUserProfile = function() {

    var username = null;
    var avatar = null;

    var fetchUserProfile = function() {
        $.get('/synclets/facebook/get_profile', function(body) {
            if (body.username) {
                avatar = "http://graph.facebook.com/" + body.username + "/picture";
                username = body.name;
            } else {
                $.get('/synclets/twitter/get_profile', function(body) {
                    if (body.profile_image_url_https) {
                        avatar = body.profile_image_url_https;
                        username = body.name;
                    }
                });
            }
        });
    };

    profileTimeout = setInterval(function() {
        fetchUserProfile();
        if (username !== null) {
            clearInterval(profileTimeout);
            $('.avatar', window.parent.document).attr('src', avatar);
            $('.user-info-name-link', window.parent.document).text(username);
        }
    }, 500);
};