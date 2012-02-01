exports.twitter = {
    photo: 'profile_image_url',
    address: {
        type:'location',
        key:'location'
    },
    nickname: 'screen_name',
    or: {
        'accounts.foursquare.data.contacts.twitter':'screen_name'
    }
};

exports.github = {
    nickname: 'login',
    email: 'email',
    photo: function(data) {
        if(data.gravatar_id) return 'https://secure.gravatar.com/avatar/' + data.gravatar_id;
    }
};

exports.facebook = {
    photo: function(data) {
        return 'https://graph.facebook.com/' + data.id + '/picture';
    },
    gender: 'gender',
    or: {
        'accounts.foursquare.data.contacts.facebook':'id'
    }
};

exports.flickr = {
    id: 'nsid',
    name: 'realname',
    nickname: 'username',
    photo: function(data) {
        if(data.nsid && data.iconfarm && data.iconserver) return 'http://farm' + data.iconfarm + '.static.flickr.com/' + data.iconserver + '/buddyicons/' + data.nsid + '.jpg';
    }
};

exports.instagram = {
    name: 'full_name',
    photo: 'profile_picture',
    nickname: 'username'
};

exports.linkedin = {
    name: function(data) {
        return data.firstName + ' ' + data.lastName;
    },
    photo: 'pictureUrl'
};

exports.foursquare = {
    name: function(data) {
        return data.firstName + (data.lastName? ' ' + data.lastName: '');
    },
    gender: 'gender',
    email : 'contact.email',
    phoneNumber : {
        key: 'contact.phone',
        type: 'mobile'
    },
    address: {
        type: 'location',
        key: 'homeCity'
    },
    or: {
        'accounts.twitter.data.screen_name':'contact.twitter',
        'accounts.facebook.data.id':'contact.facebook'
    }
};

exports.gcontacts = {
    photo: function(data) {
        if(data.id && data.photo) return '/synclets/gcontacts/getPhoto/' + data.id;
    },
    address: {
        key: 'address'
    },
    phoneNumber: {
        key: 'phone'
    },
    email: 'email'
};
