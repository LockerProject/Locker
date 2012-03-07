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

    return {
        connectService : connectService
    };
})();
