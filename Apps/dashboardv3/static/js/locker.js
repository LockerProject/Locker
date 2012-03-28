Locker = (function() {
  function connectService(evt) {
    evt.preventDefault();
    var $el = $(evt.currentTarget);
    var options =
      'width='   + $el.data('width')  +
      ',height=' + $el.data('height') +
      ',status=no,scrollbars=no,resizable=no';
    var popup = window.open('/auth/' + $el.data('provider'),
                            'account', options);
    // create a ga event for adding a new service
    popup.focus();
    return false;
  }

  function syncService(provider, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    if (typeof options.force === 'undefined') options.force = true;
    $.get('/Me/' + provider + '/run', options, function(r) {
      callback(r === true);
    }).error(function(r) {
      callback(false);
    });
  }

  return {
    connectService : connectService,
    syncService    : syncService
  };
})();
