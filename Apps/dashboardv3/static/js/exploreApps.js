$(document).ready(function() {
  $('.body').delegate('.app-card', 'hover', appCardHover)
  $('.body').delegate('.install', 'click', function(e) {
    var $e = $(e.currentTarget);
    var id = $e.attr('id');
    $.get('/registry/add/' + id, function() {
      parent.window.location = 'you#app-' + id;
    });
    return false;
  });

  $('.oauthLink').click(function() {
    var popup = window.open($(this).attr('href'), "account", "width=" + $(this).data('width') + ",height=" + $(this).data('height') + ",status=no,scrollbars=no,resizable=no");
    popup.focus();
    return false;
  });

});

function appCardHover(e) {
  if (e.type === 'mouseenter') {
    $(e.currentTarget).find('.screenshot').stop().animate({'top': '100px'});
  } else {
    $(e.currentTarget).find('.screenshot').stop().animate({'top': '0px'});
  }
}