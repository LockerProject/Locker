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
            var url = info.externalHost + '/settings';
            $.ajax({type        : 'POST',
                    url         : url,
                    data        : post,
                    dataType    : 'json',
                    crossDomain : true,
                    complete    : function (result) {
                        alert('hi');
                    }});
        },
        invalidHandler : function (form) {
            alert("You done screwed the pooch, chum.");
        }
    });
});
