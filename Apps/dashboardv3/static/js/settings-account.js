$(function () {
    $('input[name=username]').val(info.name);
    $('input[name=email]').val(info.email);
    $('input[name=avi_url]').val(info.imageUrl);

    var validate = $('#settings-account').validate({
        debug : true,
        rules : {
            username : {
                required  : true,
                minlength : 2
            },
            email : {
                required : true,
                email    : true
            },
            old_password : {
                minlength : 6
            },
            new_password : {
                minlength : 6
            }
        },
        messages : {
            username : {
                required  : "We need to know what to call you, hoss.",
                minlength : "At least 2 characters are necessary."
            },
            email : {
                required : "Your email address is also how you sign in. Required!"
            },
            old_password : {
                minlength : "At least 6 characters are necessary."
            },
            new_password : {
                minlength : "At least 6 characters are necessary."
            }
        },
        submitHandler : function (form) {
            var post = {lockerName   : $(username).val(),
                        email        : $(email).val(),
                        username     : $(username).val(),
                        old_password : $(old_password).val(),
                        new_password : $(new_password).val(),
                        optout       : $(optout).is(':checked') ? true : undefined};

            if (post.old_password && post.new_password) {
                var passwordUrl = info.externalHost + '/users/changePassword';
                $.ajax({url         : passwordUrl,
                        data        : post,
                        dataType    : 'jsonp',
                        error       : function (xhr, status, err) {
                            alert(status + ': ' + err + ' (from url ' + passwordUrl + ')');
                        },
                        success     : function (data, status, xhr) {
                            alert('somehow, success: ' + data);
                        }});
            }
            /*var url = info.externalHost + '/settings';
            $.ajax({type        : 'POST',
                    url         : url,
                    data        : post,
                    dataType    : 'json',
                    crossDomain : true,
                    complete    : function (result) {
                        alert('hi');
                    }});*/
        },
        invalidHandler : function (form) {
            alert("You done screwed the pooch, chum.");
        }
    });
});
