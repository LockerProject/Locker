$.cookie("firstvisit", true);

var profileTimeout;

$(function() {
    $(".connect-button-link").click(function(e) {
        e.preventDefault();
        showAllConnectors();
    });
    
    $('.oauthLink').click(function(e) {
        e.preventDefault();
        var popup = window.open($(this).attr('href'), "account", "width=" + $(this).data('width') + ",height=" + $(this).data('height') + ",status=no,scrollbars=no,resizable=no");
        popup.focus();
      });
});

// this one is called only when going through a first-time connection
var syncletInstalled = function(provider) {
    $('.oauthLink img').each(function(index) {
        if ($(this).parent().attr('data-provider') === provider) {
            $(this).attr('src', 'img/connected.png');
        }
    });

    $('.sidenav-items.synclets', window.parent.document).append("<img class='installed' src='img/icons/32px/"+provider+".png'>");
    showAllConnectors();
    updateUserProfile();
};

var showAllConnectors = function() {
    $("#main-header-1").hide();
    $("#main-header-2").show();
    $(".hideable").fadeIn();
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

