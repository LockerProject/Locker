var app;
var specialApps = {
    "allApps" : "/dashboard/allApps",
    "publish" : "/dashboard/publish",
    "viewAll" : "/dashboard/viewAll"
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
});

var loadApp = function() {
  $('.app-details').hide();
  $('.iframeLink').removeClass('blue');
  window.location.hash = app;
  if (specialApps[app]) {
    $("#appFrame")[0].contentWindow.location.replace(specialApps[app]);
    $('.iframeLink[data-id="' + app + '"]').addClass('blue');
  } else {
    $.get('clickapp/' + app, function(e) {});
    $('.iframeLink[data-id="' + app + '"]').addClass('blue').parent('p').siblings().show();
    $("#appFrame")[0].contentWindow.location.replace('/Me/' + app);
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
