$(document).ready(function() {
  $('img[src="img/loading6.gif"]').each(poll);
});

var filterItems = function(type) {
  $('li').show();
  if (type === 'published') {
    $('.drafts').parents('li').fadeOut();
  } else {
    $('.published').parents('li').fadeOut();
  }
}

var poll = function(ind, elem) {
  $.get("finishedCropping/" + $(elem).data('app'), function(data) {
    if (data) {
      $(elem).attr('src', 'screenshot/' + $(elem).data('app'));
    } else {
      window.setTimeout(function() { poll(ind, elem); }, 200);
    }
  });
}
