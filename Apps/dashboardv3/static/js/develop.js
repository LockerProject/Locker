if (typeof Locker === 'undefined') Locker = {};

Locker.Develop = (function() {
  function init() {
    selectCurrent();
    handleLinks();
    loadExternalDocs();
  }

  function selectCurrent() {
    var hash = window.parent.location.hash;
    $('#develop-nav a[href=' + hash + ']').addClass('selected');
  }

  function handleLinks() {
    $('#develop-nav a, a.iframeLink').click(function(e) {
      e.preventDefault();
      var link = $(this);
      var href = link.attr('href');
      if (href.indexOf('#') === 0) window.parent.location.hash = href;
      else window.open(href, '_blank').focus();
    });
  }

  function loadExternalDocs() {
    $('.lazyload').each(function(i, el) {
      el = $(el);
      $.get(el.data('src'), function(r) { el.html(r); });
    });
  }

  return {
    init : init
  };
})();

$(Locker.Develop.init);
