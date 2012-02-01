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

    $('input[name=name]').val(info.name);
    $('input[name=email]').val(info.email);

    if (info.imageUrl) {
        $('input[name=avi_url]').val(info.imageUrl);
        $('input[name=avi_chooser]').prop('disabled', true);
    }

    $('body').delegate('#avi_url.disabled', 'click', function (e) {
        $('input[name=avi_url]').removeClass('disabled');
        $('input[name=avi_chooser]').addClass('disabled');
    });

    $('body').delegate('#avi_chooser.disabled', 'click', function (e) {
        $('input[name=avi_chooser]').removeClass('disabled');
        $('input[name=avi_url]').addClass('disabled');
        $('input[name=avi_url]').val('');
    });

    showAllConnectors();
});

var showHiddenConnectors = function () {
    $(".hideable").fadeIn();
};

var showAllConnectors = function () {
    $(".synclets-list li").fadeIn();
};
