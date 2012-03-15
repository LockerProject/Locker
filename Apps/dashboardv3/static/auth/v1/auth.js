;(function($) {

    $.singly = function(options) {
        options.appName = options.appName || 'Sample app';
        options.baseUrl = '/dashboard/auth/v1/';

        $('<link rel="stylesheet" type="text/css" href="' + options.baseUrl + 'auth.css">').appendTo('head');
        $('<div id="SINGLY-auth-container"></div>').prependTo('body').load(options.baseUrl + 'auth.html', function() {
            if (isLoggedIn()) {
                showLoggedInPane();
            } else {
                showPreviewPane();
            }

            $("#SINGLY-preview-app-button").on('click', function(e) {
                showConnectPane();
            });

            $("#SINGLY-connect-facebook").on('click', function(e) {
                e.preventDefault();
                connectService($(this));
                //showSaveAccessPane();
            });

            $("#SINGLY-connect-twitter").on('click', function(e) {
                e.preventDefault();
                connectService($(this));
                //showSaveAccessPane();
            });

            $("#SINGLY-temp-savepreview").on('click', function(e) {
                // TODO: save preview account and send e-mail
                showSaveAccessPane();
            });

            $("#SINGLY-temp-connectmore").on('click', function(e) {
                // TODO: save preview account and send e-mail
                showConnectMorePane();
            });

            $(".SINGLY-close-x").on('click', function(e) {
                $(".SINGLY-pane").fadeOut('fast');
            });

            $("#SINGLY-loggedin-pane").on('mouseenter', function(e) {
                $(this).animate({
                    'margin-top': '0px',
                    opacity: 1
                }, 200);
            });

            $("#SINGLY-loggedin-pane").on('mouseleave', function(e) {
                $(this).delay(800).animate({
                    'margin-top': '-22px',
                    opacity: 0.5
                }, 200);
            });

            function showLoggedInPane() {
                hidePanes();
                $("#SINGLY-myaccount-link").attr('href', '/dashboard/settings#Settings-AccountInformation');
                $("#SINGLY-loggedin-pane").show();
            };

            function showPreviewPane() {
                hidePanes();
                $("#SINGLY-or-signin-link").attr('href', '/login?redir=' + window.location.href);
                $("#SINGLY-preview-pane").fadeIn('fast');
            };

            function showConnectPane() {
                hidePanes();
                $("#SINGLY-connect-pane-headline").html('Connect services to preview ' + options.appName + '*');
                $("#SINGLY-connect-facebook").attr('href', '/auth/facebook');
                $("#SINGLY-connect-twitter").attr('href', '/auth/twitter');
                $("#SINGLY-connect-pane").fadeIn('fast');
            };

            function showSaveAccessPane() {
                hidePanes();
                $("#SINGLY-saveaccess-pane").fadeIn('fast');
            };

            function showConnectMorePane() {
                hidePanes();
                $("#SINGLY-connectmore-pane").fadeIn('fast');
            };

            function hidePanes(callback) {
                $(".SINGLY-pane").fadeOut('fast');
            };

            function isLoggedIn() {
                var pairs = document.cookie.split('; ');
                var decode = options.raw ? function(s) { return s; } : decodeURIComponent;
                for (var i=0, pair; pair=pairs[i] && pairs[i].split('='); i++) {
                    if (decode(pair[0]) === 'lockerlogin' && pair[1] !== '') {
                        return true;
                    }
                }
                return false;
            };

            function connectService(element) {
                var options =
                    'width='   + element.data('width')  +
                    ',height=' + element.data('height') +
                    ',status=no,scrollbars=no,resizable=no';
                var popup = window.open('/auth/' + element.data('provider'),
                                        'account', options);
                popup.focus();
            };
        });
    }
})(jQuery);

syncletInstalled = function(synclet) {
    window.location.reload();
}
