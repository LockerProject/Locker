$(document).ready(function() {
  $('.body').delegate('.app-card', 'hover', function(e) {
    if (e.type === 'mouseenter') {
      $(e.currentTarget).find('.screenshot').stop().animate({'top': '100px'});
    } else {
      $(e.currentTarget).find('.screenshot').stop().animate({'top': '0px'});
    }
  }).delegate('.install', 'click', function(e) {
    var $e = $(e.currentTarget);
    var id = $e.attr('id');
    $.get('/registry/add/' + id, function() {
      parent.window.location = 'you#' + id;
    });
  });
});
