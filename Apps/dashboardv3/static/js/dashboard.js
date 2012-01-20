var defaultApp = 'contactsviewer';
var specialApps = {
    "allApps" : "allApps",
    "publish" : "publish",
    "viewAll" : "viewAll",
    "exploreApps" : "exploreApps",
    "registryApp" : "registryApp"
};

$(document).ready(function() {
  loadDiv(window.location.hash.substring(1) || $('.installed-apps a').data('id') || defaultApp);

  $('.oauthLink').click(function() {
    var popup = window.open($(this).attr('href'), "account", "width=" + $(this).data('width') + ",height=" + $(this).data('height') + ",status=no,scrollbars=no,resizable=no");
    popup.focus();
    return false;
  });

  $('.your-apps').click(function() {
    $('.blue').removeClass('blue');
    $(this).addClass('blue');
    if (document.getElementById('appFrame').contentWindow.filterItems) {
      document.getElementById('appFrame').contentWindow.filterItems($(this).attr('id'));
    }
  });
});

var loadApp = function(app) {
  var appUrl = app;
  $(".sidenav section").addClass('selected-section');
  var params = '';
  if (app.indexOf('&') != -1) {
    appUrl = app.substring(0, app.indexOf('&'));
    params = app.substring(app.indexOf('&') + 1);
  }
  $('.app-details').hide();
  $('.iframeLink,.your-apps').removeClass('blue');
  window.location.hash = app;
  if (specialApps[appUrl]) {
    $("#appFrame")[0].contentWindow.location.replace(specialApps[appUrl] + '?params=' + params);
  } else {
    $.get('clickapp/' + appUrl, function(e) {});
    $("#appFrame")[0].contentWindow.location.replace('/Me/' + appUrl);
  }
  $('.iframeLink[data-id="app-' + appUrl + '"]').addClass('blue').parent('p').siblings().show();
  $('.sidenav-items input').attr('checked', false)
  if (params.indexOf('filter') === 0) {
    var boxes = params.split('&');
    for (var i = 0; i < boxes.length; i++) {
      var item = boxes[i].split('=');
      if (item.length > 1) {
        $('#' + item[1]).attr('checked', true);
      }
    }
  }
};

var syncletInstalled = function(provider) {
  if (provider === 'github') {
    $('.your-apps').show();
  }
  var link = $('.oauthLink[data-provider="' + provider + '"]');
  link.children('img').addClass('installed').appendTo('.sidenav-items.synclets');
  link.remove();
};
