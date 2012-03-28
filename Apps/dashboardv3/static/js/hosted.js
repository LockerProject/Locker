userName = '';
userEmail = '';
userImageUrl = '';
userOptin = '';
userApiToken = '';
externalHost = '';
var clicked = false;

function setUserGlobals(data) {
    userName = data.name;
    userEmail = data.email;
    userImageUrl = data.imageUrl;
    userOptin = data.optin;
    userApiToken = data.apiToken;
    externalHost = data.externalHost;

    $.cookie('optin', userOptin, {path: '/'});

    $('.user-info-name-link').text(userName);
}

$(document).ready(function() {
    if (userOptin === 'false') {
        $('#settings_analytics_optedout').removeClass('hidden');
        $('#settings_analytics').addClass('hidden');
    }

    if (userOptin === 'true') {
        $('.app-page').append('<script type=\'text/javascript\' charset=\'utf-8\' src=\'js/ga.js\'></script>');
    }
});
