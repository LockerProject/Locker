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
    $.getJSON('/synclets', function(synclets) {
        var installed = synclets.installed;
        for(var i in installed) {
            if(installed[i].id === "github") {
                return callback(true);
            }
        }
        callback(false, synclets.available);
    });
}

function waitForGitHubConnected(callback) {
    isGitHubConnected(function(has) {
        if(has) return callback();
        setTimeout(function() {
            waitForGitHubConnected(callback);
        }, 1000);
    });
}

function getGitHubProfile(callback) {
    $.getJSON("/synclets/github/getCurrent/profile", function(profileArr) {
        callback(profileArr[0]);
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

function checkForToken(callback) {
    $.getJSON('https://singly.com/users/me/apiToken', callback);
}

var syncingViewers = false;
function syncViewers() {
    if(syncingViewers) return;
    syncingViewers = true;
    $("#sync-link").removeAttr("href");
    $.getJSON("/synclets/github/run?id=repos", function(success) {
        _kmq.push(['record', 'synced viewers']);
        if(success) {
            $("#sync-link").attr("href", "#");
            syncingViewers = false;
            $("#synced").css({"display":"block"});
        }
    });
}

function waitForGitHubConnected(callback) {
    isGitHubConnected(function(isInstalled, available) {
        if(isInstalled) {
            $("#connect").addClass('done');
            callback();
        } else {
            for(var i in available) {
                if(available[i].provider === 'github') {
                    $("#connect-link").attr('href', "#");
                    var url = available[i].authurl;
                    $("#connect-link").click(function() {
                        accountPopup(url);
                        waitForGitHubConnected(function() {
                            $("#connect").addClass('done');
                            $("#connect-link").removeAttr('href');
                            callback();
                        });
                    });
                    return;
                }
            }
        }
    });
}

$(document).ready(function() {
    checkForToken(function(token) {
        if(!token || !token.apiToken) return;
        $("#token").html("baseUrl = 'https://api.singly.com/"+token.apiToken+"';");
    });
    waitForGitHubConnected(function() {
        pollForGitHubProfile();
    });
    $("#sync-link").click(syncViewers);
    
    if ($.cookie('optin') === "true") {
        $("body").append('<script type="text/javascript" charset="utf-8" src="js/ga.js"></script>');
    }
});