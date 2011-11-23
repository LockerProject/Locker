var app;

$(document).ready(function() {
  app = window.location.hash.substring(1) || "contactsviewer";
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
  $('.iframeLink').removeClass('orange');
  window.location.hash = app;
  $('.iframeLink[data-id="' + app + '"]').addClass('orange');
  $("#appFrame")[0].contentWindow.location.replace('/Me/' + app);
};

var installed = function(provider) {
  var link = $('.oauthLink[data-provider="' + provider + '"]');
  link.children('img').addClass('installde').appendTo('.sidenav-items.synclets');
  link.remove();
};
