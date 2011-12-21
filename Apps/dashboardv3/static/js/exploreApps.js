$(document).ready(function() {
  $('.app-card').hover(function() {
    $(this).find('.screenshot').stop().animate({'top': '100px'});
  }, function() {
    $(this).find('.screenshot').stop().animate({'top': '0px'});
  });
});
