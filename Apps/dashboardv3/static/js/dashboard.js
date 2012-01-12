var app;
var specialApps = {
    "allApps" : "allApps",
    "publish" : "publish",
    "viewAll" : "viewAll",
    "exploreApps" : "exploreApps",
    "registryApp" : "registryApp",
    "connect" : "connect"
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
    if (document.getElementById('appFrame').contentWindow.filterItems) {
      document.getElementById('appFrame').contentWindow.filterItems($(this).attr('id'));
    }
  });

  $('.sidenav-items input').click(function() {
    var checked = $('.sidenav-items input:checked');
    if (checked.length === 0) {
      $('.your-apps').click();
    } else {
      $('.your-apps').removeClass('blue');
      app = "exploreApps&filter";
      var types = [];
      var services = [];
      $('#types').find(checked).each(function(i, elem) {
        app += "&types[]=" + $(elem).attr('id');
      });
      $('#services').find(checked).each(function(i, elem) {
        app += "&services[]=" + $(elem).attr('id');
      });
      loadApp();
    }
  });
  
  $('.gotit-button').click(function(e) {
      e.preventDefault();
      $(this).parent().parent().hide();
  });
  
  $('#takemeback-link').click(function(e) {
     e.preventDefault();
     window.location.hash = "#connect";
     window.location.reload(); 
  });
  
  if (window.location.hash === "#connect") {
      $('#firstvisit-overlay').hide();
  }
});

var loadApp = function(callback) {
  var appUrl = app;
  var params = '';
  if (app.indexOf('&') != -1) {
    appUrl = app.substring(0, app.indexOf('&'));
    params = app.substring(app.indexOf('&') + 1);
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
    $("#appFrame")[0].contentWindow.location.replace(specialApps[appUrl] + '?params=' + params);
  } else {
    $.get('clickapp/' + appUrl, function(e) {});
    $("#appFrame")[0].contentWindow.location.replace('/Me/' + appUrl);
  }
  $('.iframeLink[data-id="' + app + '"]').addClass('blue').parent('p').siblings().show();
  $('.sidenav-items input').attr('checked', false);
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
