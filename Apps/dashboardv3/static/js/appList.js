$(document).ready(function() {
    /* use a function for the exact format desired... */
  function ISODateString(d) {
    function pad(n) { return n<10 ? '0'+n : n }
    return d.getUTCFullYear()+'-'
          + pad(d.getUTCMonth()+1)+'-'
          + pad(d.getUTCDate())+'T'
          + pad(d.getUTCHours())+':'
          + pad(d.getUTCMinutes())+':'
          + pad(d.getUTCSeconds())+'Z'
  }

  $.each($('time.timeago'), function(index, value) {
    var d = new Date(parseInt($(value).attr('datetime')));
    $(value).attr('datetime', ISODateString(d));
  });

  jQuery("time.timeago").timeago();

  $('a').click(function(e) {
    window.parent.location = $(this).attr('href');
    return false;
  });

  $('li').click(function() {
    window.parent.loadDiv($(this).data('id'));
  });
});
