$.cookie("firstvisit", true, {path: '/' });

var profileTimeout;
var hasTwitterOrFacebook = false;

$(function() {
    $(".connect-button-link").click(function(e) {
        e.preventDefault();
        showHiddenConnectors();
    });

    //copied from dashboard.js
    $('body').delegate('.oauthLink','click', function(e) {
        var that = $(this);
        if (that.is(':disabled') || that.hasClass('disabled')) return false;
        var options = "width=" + that.data('width') + ",height=" + that.data('height') + ",status=no,scrollbars=no,resizable=no";
        var popup = window.open(that.attr('href'), "account", options);
        popup.focus();
        return false;
    });

    if ($('.sidenav-items synclets-connected', window.parent.document).length > 0) {
        showAllConnectors();
    }

    $('#start-exploring-link').click(function(e) {
        e.preventDefault();
        parent.window.location.replace('/');
    });

    $('.synclets-list li a').each(function(index, item) {
        var that = $(this);
        if (that.attr('data-provider') === 'twitter' || that.attr('data-provider') === 'facebook') {
            that.parent().fadeIn();
            hasTwitterOrFacebook = true;
        }
    });

    // if apikeys doens't have twitter/facebook, just show everything
    if (hasTwitterOrFacebook === false) {
        showAllConnectors();
    }
});

// this one is called only when going through a first-time connection
var syncletInstalled = function(provider) {
    var dataProvider = '[data-provider=' + provider + ']';
    var newIcon = $('<img>', {src: 'img/icons/32px/' + provider + '.png'});
    $('.oauthLink' + dataProvider).text('Connected').addClass('disabled');
    $('.synclets-connected', window.parent.document).append(newIcon);
    $('.synclets-unconnected a' + dataProvider, window.parent.document).remove();
    showHeaderTwo();
    showAllConnectors();
    updateUserProfile();
};

var showHiddenConnectors = function() {
    showHeaderTwo();
    $(".hideable").fadeIn();
};

var showHeaderOne = function() {
    if ($("#main-header-2").is(":visible")) {
        $("#main-header-2").hide();
        $("#main-header-1").show();
    }
};

var showHeaderTwo = function() {
    if ($("#main-header-1").is(":visible")) {
        $("#main-header-1").hide();
        $("#main-header-2").show();
    }
};

var showAllConnectors = function() {
    $(".synclets-list li").fadeIn();
};

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

