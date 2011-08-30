function log(m) { if (console && console.log) console.log(m); }

$(document).ready(
    function() {
        $('#main .body').delegate('.box', 'click', function() {
            window.location = 'app.html#' + $(this).attr('id');
        });
    }
);