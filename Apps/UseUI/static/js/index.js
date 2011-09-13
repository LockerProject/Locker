function log(m) { if (console && console.log) console.log(m); }

$(document).ready(
    function() {
        $('#main .body').delegate('.box', 'click', function() {
            window.location = 'app.html#' + $(this).attr('id');
        });
        $('#main .box').mousedown(function() {
            $(this).addClass('clicked');
        });
        $('#main .box').mouseup(function() {
            $(this).removeClass('clicked');
        });
        $('#main .box').mouseleave(function() {
            $(this).removeClass('clicked');
        });
        $('#nav-search').submit(function() {
            alert('Handler for .submit() called.');
            return false;
         });

    }
);
