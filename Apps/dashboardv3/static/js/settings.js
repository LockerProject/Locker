var info = {};

function setUserGlobals(data) {
    info = data;
}

$(function () {
    $(".connect-button-link").click(function (e) {
        e.preventDefault();
        showHiddenConnectors();
    });

    $("#showToken").click(function(e) {
      $("#apiToken").val(info.apiToken);
    });

    $("#resetToken").click(function(e) {
      $.jsonp({url : info.externalHost + '/users/me/resetApiToken',
               callbackParameter : 'callback',
               error : function (xopts, status) {
                   if (console && console.error) console.error('Uhoh: ' + status);
               },
               success : function (json, status) {
                   $("#apiToken").val(json.apiToken);
               }
      });
    });

    // copied from connect.js
    $('body').delegate('.oauthLink','click', function (e) {
        var options = "width=" + $(this).data('width') + ",height=" + $(this).data('height') + ",status=no,scrollbars=no,resizable=no";
        var popup = window.open($(this).attr('href'), "account", options);
        popup.focus();
        return false;
    });

    $('body').delegate('input[name=optout]', 'click', function (e) {
        $('#settings_analytics').addClass('hidden');
        $('#settings_analytics_optedout').removeClass('hidden');
    });

    $('input[name=username]').val(info.name);
    $('input[name=email]').val(info.email);
    $('input[name=avi_url]').val(info.imageUrl);

    var validate = $('#settings-account').validate({
        rules : {
            avi_url : {url : true},
            username : {required  : true, minlength : 2},
            email : {required : true, email : true},
            old_password : {minlength : 6},
            new_password : {minlength : 6}
        },
        messages : {
            avi_url : {url : "Need a real URL to download and store your new avatar."},
            username : {required  : "We need to know what to call you, hoss.",
                        minlength : "At least 2 characters are necessary."},
            email : {required : "Your email address is also how you sign in. Required!"},
            old_password : {minlength : "At least 6 characters are necessary."},
            new_password : {minlength : "At least 6 characters are necessary."}
        },
        submitHandler : function (form) {
            var email       = $('#email').val();
            var username    = $('#username').val();
            var oldPassword = $('#old_password').val();
            var newPassword = $('#new_password').val();
            var aviUrl      = $('#avi_url').val();
            var optout      = $('#optout').is(':checked') ? true : undefined;

            // There are three pieces to saving this farrago of stuff:
            //
            // 1. change passwords, if they've been passed in
            if (oldPassword && newPassword) {
                var passwordUrl = info.externalHost + '/users/changePassword';
                $.jsonp({url : passwordUrl,
                         callbackParameter : 'callback',
                         data : {old_password : oldPassword,
                                 new_password : newPassword},
                         error : function (xopts, status) {
                             if (console && console.error) console.error(status + ': from url ' + xopts.url);
                             $('#settings_account_error').text('Password change failed. Perhaps you entered your old password incorrectly?');
                         },
                         success : function (json, status) {
                             $('#settings_account_error').text('Your password was successfully changed.');
                         }});
            }

            // 2. Update the user's avatar, if they've provided / changed the URL.
            if (aviUrl) {
                var aviUpdateUrl = 'settings-account';
                $.ajax({url : aviUpdateUrl,
                        method : 'POST',
                        dataType : 'json',
                        data : {avi_url : aviUrl},
                        error : function (xhr, status, err) {
                            $('#settings_account_error').text('Unable to update your avatar: ' + err);
                        },
                        success : function (body, status, xhr) {
                            $('#settings_account_error').text('Updated your avatar!');
                        }
                });
            }

            // 3. Save the rest of the settings to Integral.
            var settingsUrl = info.externalHost + '/users/updateSettings';
            $.jsonp({url : settingsUrl,
                     callbackParameter : 'callback',
                     data : {username : username,
                             email : email,
                             optout : optout},
                     error : function (xopts, status) {
                         $('#settings_account_error').text('Unable to update your settings.');
                     },
                     success : function (json, status) {
                         $('#settings_account_error').text('Updated your settings.');
                     }
            });
        }
    });

    showAllConnectors();
});

var showHiddenConnectors = function () {
    $(".hideable").fadeIn();
};

var showAllConnectors = function () {
    $(".synclets-list li").fadeIn();
};
