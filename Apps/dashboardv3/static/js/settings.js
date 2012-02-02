var info = {};

function setUserGlobals(data) {
    info = data;
}

function updateToken(json) {
  info.apiToken = json.apiToken;
  $("#apiToken").val(info.apiToken);
}

$(function () {
    $(".connect-button-link").click(function (e) {
        e.preventDefault();
        showHiddenConnectors();
    });

    $("#showToken").click(function(e) {
      $("#apiToken").val(info.apiToken);
    });

    $("#resetToken").click(function(e) {
      $.ajax({
        dataType: 'jsonp',
        crossDomain: true,
        jsonpCallback: 'updateToken',
        url: info.externalHost + '/users/me/resetApiToken?updateToken=',
        type: 'GET'
      })
      .fail(function(data, status, three) {
            console.error('Uhoh: ' + data);
            console.error(data);
      });
    });

    // copied from connect.js
    $('body').delegate('.oauthLink','click', function (e) {
        var options = "width=" + $(this).data('width') + ",height=" + $(this).data('height') + ",status=no,scrollbars=no,resizable=no";
        var popup = window.open($(this).attr('href'), "account", options);
        popup.focus();
        return false;
    });

    showAllConnectors();
});

var showHiddenConnectors = function () {
    $(".hideable").fadeIn();
};

var showAllConnectors = function () {
    $(".synclets-list li").fadeIn();
};
