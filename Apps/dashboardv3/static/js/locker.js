Locker = (function() {
  function connectService(evt) {
    evt.preventDefault();
    var options =
      'width='   + $(this).data('width')  +
      ',height=' + $(this).data('height') +
      ',status=no,scrollbars=no,resizable=no';
    var popup = window.open('/auth/' + $(this).data('provider'),
                            'account', options);
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
