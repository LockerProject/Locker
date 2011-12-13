$(document).ready(function() {
  $('.authorship-history').click(function() {
    $(this).toggleClass('expanded');
  });
});

var filterItems = function(type) {
  $('li').show();
  if (type === 'published') {
    $('.drafts').parents('li').fadeOut();
  } else {
    $('.published').parents('li').fadeOut();
  }
}
