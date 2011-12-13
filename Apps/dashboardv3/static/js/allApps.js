$(document).ready(function() {
  $('.authorship-history').click(function() {
    $(this).toggleClass('expanded');
  });

  $('.publishLink').click(function() {
    var id = $(this).attr('id');
    window.parent.app = 'publish';
    window.parent.loadApp(function() {
        window.parent.document.getElementById('appFrame').contentWindow.selectItem(id);
    });
    return false;
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
