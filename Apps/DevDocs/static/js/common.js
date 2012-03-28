var _kmq = _kmq || [];

// this needs some cleanup to actually use the proper height + widths
function accountPopup(url) {
    var popup = window.open(url, "account", "width=1000,height=1000,status=no,scrollbars=no,resizable=no");
    popup.focus();
}

$.ajaxSetup({
    xhrFields: {
       withCredentials: true
    },
    crossDomain: true
});

function isGitHubConnected(callback) {
    $.getJSON('/map', function(map) {
        console.error("DEBUG: map.github", map.github);
        return callback(map.github && map.github.auth && map.github.auth.profile && map.github.authed > 0);
    });
}

function getGitHubProfile(callback) {
    $.getJSON("/map/profiles", function(profiles) {
        console.error("DEBUG: profiles", profiles);
        for(var i in profiles) if(i.indexOf('contact://github/') === 0) return callback(profiles[i]);
        return callback();
    });
}

function pollForGitHubProfile(callback) {
    getGitHubProfile(function(profile) {
        if(profile) return callback(profile);
        setTimeout(function() {
            pollForGitHubProfile(callback);
        }, 1000);
    });
}
// 
// function checkForToken(callback) {
//     if (document.location.host.substr(0,3) != 'me.') return callback();
//     var host = document.location.host.substr(3);
//     var url = 'https://'+host+'/users/me/apiToken';
//     console.error("DEBUG: url", url);
//     $.getJSON('https://'+host+'/users/me/apiToken', callback);
// }
// 
// var syncingViewers = false;
// function syncViewers() {
//     if(syncingViewers) return;
//     syncingViewers = true;
//     $("#sync-link").removeAttr("href");
//     $.getJSON("/synclets/github/run?id=repos", function(success) {
//         _kmq.push(['record', 'synced viewers']);
//         if(success) {
//             $("#sync-link").attr("href", "#");
//             syncingViewers = false;
//             $("#synced").css({"display":"block"});
//         }
//     });
// }

function waitForGitHubConnected(callback) {
    isGitHubConnected(function(connected) {
        if(connected) return callback();
        setTimeout(function() {
            waitForGitHubConnected(callback);
        }, 1000);
    });
}

$(document).ready(function() {
    // console.error('DEBUG: doing check');
    // checkForToken(function(token) {
    //     console.error("DEBUG: token", token);
    //     if(!token || !token.apiToken) return;
    //     if (document.location.host.substr(0,3) != 'me.') return;
    //     var host = document.location.host.substr(3);
    //     $("#token").html("baseUrl = 'https://api."+host+"/"+token.apiToken+"';");
    // });
    // 
    // if ($.cookie('optin') === "true") {
    //     $("body").append('<script type="text/javascript" charset="utf-8" src="js/ga.js"></script>');
    // }
});