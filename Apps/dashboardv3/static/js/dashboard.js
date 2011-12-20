var app;
var specialApps = {
    "allApps" : "allApps",
    "publish" : "publish",
    "viewAll" : "viewAll",
    "exploreApps" : "exploreApps"
};

var iframeLoaded = function() {};

$(document).ready(function() {
  app = window.location.hash.substring(1) || $('.installed-apps a').data('id') || 'contactsviewer';
  loadApp();

  $('.iframeLink').click(function() {
    app = $(this).data('id');
    loadApp();
    return false;
  });

  $('.oauthLink').click(function() {
    var popup = window.open($(this).attr('href'), "account", "width=" + $(this).data('width') + ",height=" + $(this).data('height') + ",status=no,scrollbars=no,resizable=no");
    popup.focus();
    return false;
  });

  $('.your-apps').click(function() {
    $('.blue').removeClass('blue');
    $(this).addClass('blue');
    document.getElementById('appFrame').contentWindow.filterItems($(this).attr('id'));
  });
});

var loadApp = function(callback) {
  var appUrl = app;
  if (app.indexOf('&') != -1) {
    appUrl = app.substring(0, app.indexOf('&'));
  }
  if (callback) {
    iframeLoaded = callback;
  } else {
    iframeLoaded = function() {};
  }
  $('.app-details').hide();
  $('.iframeLink,.your-apps').removeClass('blue');
  window.location.hash = app;
  if (specialApps[appUrl]) {
    $("#appFrame")[0].contentWindow.location.replace(specialApps[appUrl]);
  } else {
    $.get('clickapp/' + appUrl, function(e) {});
    $("#appFrame")[0].contentWindow.location.replace('/Me/' + appUrl);
  }
  $('.iframeLink[data-id="' + app + '"]').addClass('blue').parent('p').siblings().show();
};

var syncletInstalled = function(provider) {
  if (provider === 'github') {
    $('.your-apps').show();
  }
  var link = $('.oauthLink[data-provider="' + provider + '"]');
  link.children('img').addClass('installed').appendTo('.sidenav-items.synclets');
  link.remove();
};
