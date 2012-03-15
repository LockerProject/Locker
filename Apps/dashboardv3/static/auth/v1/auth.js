;(function($) {

    $.singly = function(options) {
        options.appName = options.appName || 'Sample app';
        options.baseHost = options.baseHost || 'http://localhost:8042';
        options.baseUrl = options.baseUrl || options.baseHost + '/dashboard/auth/v1/';

        $('<link rel="stylesheet" type="text/css" href="' + options.baseUrl + 'auth.css">').appendTo('head');
        $('<div id="SINGLY-auth-container"></div>').prependTo('body').load(options.baseUrl + 'auth.html', function() {         
            showPreviewPane();

            $("#SINGLY-preview-app-button").on('click', function(e) {
                showConnectPane();
            });

            $("#SINGLY-login-facebook").on('click', function(e) {
                // TODO: auth with FB
                showSaveAccessPane();
            });

            $("#SINGLY-login-twitter").on('click', function(e) {
                // TODO: auth with Twitter
                showSaveAccessPane();
            });

            $("#SINGLY-save-preview-button").on('click', function(e) {
                // TODO: save preview account and send e-mail
                showConnectMorePane();
            });

            $(".SINGLY-close-x").on('click', function(e) {
                $(".SINGLY-pane").fadeOut('fast');
            });

            function showPreviewPane() {
                hidePreviewPanes();
                $("#SINGLY-preview-pane").fadeIn('fast');
            };

            function showConnectPane() {
                hidePreviewPanes();
                $("#SINGLY-connect-pane-headline").html('Connect services to preview ' + options.appName + '*');
                $("#SINGLY-connect-facebook").attr('href', options.baseHost + '/auth/facebook');
                $("#SINGLY-connect-twitter").attr('href', options.baseHost + '/auth/twitter');
                $("#SINGLY-connect-pane").fadeIn('fast');
            };

            function showSaveAccessPane() {
                hidePreviewPanes();
                $("#SINGLY-saveaccess-pane").fadeIn('fast');
            };

            function showConnectMorePane() {
                hidePreviewPanes();
                $("#SINGLY-connectmore-pane").fadeIn('fast');
            };

            function hidePreviewPanes(callback) {
                $(".SINGLY-pane").fadeOut('fast');
            } 
        });
    }
})(jQuery);
