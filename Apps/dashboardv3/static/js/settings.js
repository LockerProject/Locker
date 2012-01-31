var info = {};

function setUserGlobals(data) {
    info = data;
}

$(function () {
    $(".connect-button-link").click(function (e) {
        e.preventDefault();
        showHiddenConnectors();
    });

    // copied from connect.js
    $('body').delegate('.oauthLink','click', function (e) {
        var options = "width=" + $(this).data('width') + ",height=" + $(this).data('height') + ",status=no,scrollbars=no,resizable=no";
        var popup = window.open($(this).attr('href'), "account", options);
        popup.focus();
        return false;
    });

    if ($('.sidenav-items.synclets .installed', window.parent.document).length > 0) {
        showAllConnectors();
    }

    $('input[name=accountholder-name]').val(info.name);
    $('input[name=email]').val(info.email);
    $('input[name=avi-url]').val(info.imageUrl);

    showAllConnectors();
});

var showHiddenConnectors = function () {
    $(".hideable").fadeIn();
};

var showAllConnectors = function () {
    $(".synclets-list li").fadeIn();
};
