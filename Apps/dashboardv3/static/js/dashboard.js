var app;
var specialApps = {
    "allApps" : "allApps",
    "publish" : "publish",
    "viewAll" : "viewAll"
};

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

var loadApp = function() {
  $('.app-details').hide();
  $('.iframeLink,.your-apps').removeClass('blue');
  window.location.hash = app;
  if (specialApps[app]) {
    $("#appFrame")[0].contentWindow.location.replace(specialApps[app]);
  } else {
    $.get('clickapp/' + app, function(e) {});
    $("#appFrame")[0].contentWindow.location.replace('/Me/' + app);
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
