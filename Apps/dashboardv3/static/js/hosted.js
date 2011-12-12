userEmail = "";
userName = "";
userOptin = '';
externalHost = '';
var clicked = false;

function setUserGlobals(data) {
    userName = data.name;
    userOptin = data.optin;
    externalHost = data.externalHost;

    $.cookie('optin', userOptin, {path: '/'});

    $(".user-info-name-link").text(userName);
}

$(document).ready(function() {
    if (userOptin === "true") {
        $(".app-page").append('<script type="text/javascript" charset="utf-8" src="js/ga.js"></script>');
    }
});
