var log = function(msg) { if (console && console.log) console.debug(msg); };
var displayedContact = '';

$(function() {

    $(document).keydown(function(e) {
        // disable enter
        if (e.keyCode === 13) return false;
        // esc key
        if (e.keyCode === 27) {
            $("input#search").val('');
            return true;
        }
        if ($('.clicked').length != 0) {
            // down arrow
            if (e.keyCode === 40) {
                if ($('.clicked').next().length != 0) {
                    $('.clicked').next().click();
                    window.scrollBy(0, 71);
                    return false;
                }
            // up arrow
            } else if (e.keyCode === 38) {
                if ($('.clicked').prev().length != 0) {
                    $('.clicked').prev().click();
                    window.scrollBy(0, -71);
                    return false;
                }
            }
        }
    });

    // Contact Model
    var Contact = Backbone.Model.extend({
        defaults: {}
    });

    // Contact Collection
    var AddressBook = Backbone.Collection.extend({
        model: Contact
    });

    // View used for details, overview
    var SideView = Backbone.View.extend({ 
        el: $('aside div.detail'),

        events: {},

        initialize: function() {
            _.bindAll(this, 'render'); // fixes loss of context for 'this' within methods
            that = this;
            this.render();
        },

        render: function() {
    //        this.el.html("Hello!");
        }
    });

    // List View for Contacts
    var ListView = Backbone.View.extend({ 
        el: $('body'), // attaches `this.el` to an existing element.

        _s: {
            searchIndicator: "Search..."
        },

        sortType: "firstname",

        events: {
            'keyup input#search' : 'searchChangeHandler',
            'change #sort'       : 'sortChangeHandler',

            'hover #contacts li' : 'hoverContactHandler',
            'click #contacts li' : 'clickContactHandler',
            'focus #search'      : 'focusSearchHandler',
            'blur #search'       : 'blurSearchHandler'
        },

        searchChangeHandler: function() {
            var q = $("input#search").val();
            if (q.length > 0 && q != this._s.searchIndicator) {
                this.render({q: q})
            } else {
                this.render();
            }
        },

        sortChangeHandler: function() {
            var sortVal = $("#sort").val();
            log("change sort to " + sortVal);
            this.sortType = sortVal;
            this.searchChangeHandler();
        },

        hoverContactHandler: function() {
        },

        clickContactHandler: function(ev) {
            var cid = $(ev.currentTarget).data('cid');
            if (cid === displayedContact) {
                return this.hideDetailsPane();
            }
            $('.clicked').removeClass('clicked');
            $(ev.currentTarget).addClass('clicked');
            this.drawDetailsPane(cid);
        },
        
        drawDetailsPane: function(cid) {
            displayedContact = cid;
            var self = this;
            var model = this.collection.get(cid);
            if(!(model.get('detailedData'))) {
                $.getJSON('/Me/contacts/' + cid, function(contact) {
                    model.set({detailedData : contact});
                    self.updateDetails(contact);
                });
            } else {
                self.updateDetails(model.get('detailedData'));
            }
        },
        
        hideDetailsPane: function() {
            displayedContact = '';
            $('aside').css('z-index', -1);
            $('#main').stop().animate({
                marginRight: '0px'}, 750, function() {
                    $('.detail').hide();
                })
            return $('.clicked').removeClass('clicked');
        },

        focusSearchHandler: function() {
            var searchEl = $("#search");
            if (searchEl.val() == this._s.searchIndicator) {
                searchEl.val("");
                searchEl.removeClass("inactive");
            }
        },

        blurSearchHandler: function() {
            var searchEl = $("#search");
            if (searchEl.val() == "") {
                searchEl.val(this._s.searchIndicator);
                searchEl.addClass("inactive");
            }
        },

        addContact: function(contact) {
            var newContact = new Contact();
            if (contact.name) {
                var names = contact.name.split(' ');
                newContact.set({
                    firstname: names[0],
                    lastname: names[names.length - 1],
                    name: contact.name
                })
            }

            newContact.set({
                name: contact.name,
                id: contact._id,
            });

            // copy email
            if (contact.emails) newContact.set({email: contact.emails[0].value});

            // copy photos
            if (contact.photos) newContact.set({photos: contact.photos});

            // copy accounts (twitter, github, facebook, foursquare)
            if(contact.accounts) {
                if(contact.accounts.twitter)
                    newContact.set({twitterHandle: contact.accounts.twitter[0]});
                if(contact.accounts.github)
                    newContact.set({github: contact.accounts.github[0]});
                if(contact.accounts.facebook)
                    newContact.set({facebook: contact.accounts.facebook[0].data.link});
                if(contact.accounts.googleContacts) {
                    // nothing for now, no unique data
                }
                if(contact.accounts.foursquare) {
                    newContact.set({foursquare: contact.accounts.foursquare[0]});
                }
            }

            this.collection.add(newContact); // add item to collection; view is updated via event 'add'
        },

        initialize: function(){
            _.bindAll(this, 'sortChangeHandler', 'focusSearchHandler', 'blurSearchHandler', 'searchChangeHandler', 'load', 'render', 'addContact'); // fixes loss of context for 'this' within methods
            that = this;

            this.collection = new AddressBook();

            // TODO: clean up so the search is a proper view.
            that.blurSearchHandler();
            this.load(function() {
                $("#searchBox").slideDown();
            });
        },

        /**
         * Load the contacts data (get contacts)
         * @param callback
         */
        load: function load(callback) {
            $('#loader').show();
            var that = this;
            var baseURL = '/Me/contacts';
            var offset = 0;

            (function getContactsCB() {
                $.getJSON(baseURL + '/allMinimal', {offset:offset, limit: 250}, function(contacts) {
                    if (contacts.length === 0) {
                        $('#loader').hide();
                        return callback();
                    }
                    for(var i in contacts) {
                        // only add contacts if they have a name or email. might change this.
                        if (typeof(contacts.account) != "undefined" && typeof(contacts.account.facebook) != "undefined") log(contacts[i]);
                        if (contacts[i].emails || contacts[i].name) {
                            that.addContact(contacts[i]);
                        }
                    }
                    that.render();
                    offset += 250;
                    getContactsCB();
                });
            })();
        },

        /**
         * Update the details panel with a given contact
         * @param the object containing all of the information about the contact
         */
        updateDetails: function(contact) {
            $('.name').text(contact.name);
            $('.photo').attr('src', this.getPhoto(contact, true));
            // twitter
            if (contact.accounts.twitter && contact.accounts.twitter[0].data) {
                var twitter = contact.accounts.twitter[0].data;
                $('.twitterhandle').attr('href', 'http://www.twitter.com/' + twitter.screen_name);
                $('.twitterhandle').text('@' + twitter.screen_name);
                $('.lasttweet').text(twitter.status.text);
                $('.twitterSection').show();
            } else {
                $('.twitterSection').hide();
            }
            // email
            $('.emailaddress').text(this.getEmail(contact));
            $('.emailaddress').attr('href', 'mailto:' + this.getEmail(contact));
            // phone
            var phone = this.getPhone(contact);
            $('.phonenumber').text(phone);
            if (phone) {
                $('.phoneSection').show();
            } else {
                $('.phoneSection').hide();
            }
            // 4sq
            if (contact.accounts.foursquare && contact.accounts.foursquare[0].data) {
                var fsq = contact.accounts.foursquare[0].data;
                $('.4sqlastseen').attr('href', 'http://www.foursquare.com/user/' + fsq.id + '/checkin/' + fsq.checkins.items[0].id);
                $('.4sqlastseen').text(fsq.checkins.items[0].venue.name);
                $('.foursquarehandle').attr('href', 'http://www.foursquare.com/user/' + fsq.id);
                $('.foursquareSection').show();
            } else {
                $('.foursquareSection').hide();
            }
            // gh
            if (contact.accounts.github && contact.accounts.github[0].data) {
                var gh = contact.accounts.github[0].data;
                $('.githubHandle').text(gh.login);
                $('.githubHandle').attr('href', 'http://www.github.com/' + gh.login);
                $('.githubSection').show();
            } else {
                $('.githubSection').hide();
            }
            // fb
            if (contact.accounts.facebook && contact.accounts.facebook[0].data) {
                var fb = contact.accounts.facebook[0].data;
                $('.facebookHandle').attr('href', fb.link);
                $('.facebookHandle').text(fb.name);
                $('.facebookSection').show();
            } else {
                $('.facebookSection').hide();
            }
            // location
            var loc = this.getLocation(contact);
            $('.address').text(loc);
            if (loc) {
                $('.addressSection').show();
                $('.address').attr('href', 'http://maps.google.com/maps?q=' + encodeURI(loc));
            } else {
                $('.addressSection').hide();
            }
            // animation
            if (!$('.detail').is(':visible')) {
                $('.detail').show();
                $('#main').stop().animate({
                    marginRight: '374px'}, 750, function() {
                        $('aside').css('z-index', 1);
                    });
            }
        },

        /**
         * Add the person's twitter username to a div
         * @param div - $(HTMLElement)
         * @param contact - contact obj
         */
        getTwitter: function(contact) {
            var twitterUsername;
            if(contact.accounts.twitter && contact.accounts.twitter[0].data
                   && contact.accounts.twitter[0].data.screen_name) {
                twitterUsername = contact.accounts.twitter[0].data.screen_name;
            }

            if(twitterUsername) {
                return twitterUsername;
            }
            return false;
        },

        /**
         * Add the person's Facebook details to a div
         * @param contact {Object} Contact Object
         */
        getFacebook: function(contact) {
            var facebookUsername;
            return false;
        },

        /**
         * get the location of a contact
         * @param contact - contact obj
         */
        getLocation: function(contact) {
            if(contact.addresses && contact.addresses.length) {
                for(var i in contact.addresses) {
                    if(contact.addresses[i].type === 'location') {
                        return contact.addresses[i].value;
                    }
                }
            }
            return '';
        },

        /**
         * get the phone number of a contact
         * @param contact - contact obj
         */
        getPhone: function(contact) {
            if (contact.phoneNumbers && contact.phoneNumbers.length) {
                return contact.phoneNumbers[0].value;
            }
            return '';
        },

        /**
         * Get the person's email address
         * @param contact - contact obj
         */
        getEmail: function(contact) {
            if (contact.emails && contact.emails.length) {
                return contact.emails[0].value;
            }
            return '';
        },

        /**
         * Get the person's GitHub details
         * @param contact {Object} contact obj
         */
        getGithub: function(contact) {
        },

        /**
         * Convience function to get the url from an object
         * @param contact {Object} Contact object (json)
         * @param fullsize {Boolean} Optional, default false. Use a large photo instead of small
         */
        getPhoto: function(contact, fullsize) {
            var url = 'img/silhouette.png';
            if(contact.photos && contact.photos.length) {
                url = contact.photos[0];
                //twitter
                if(fullsize && url.match(/_normal\.(jpg||png)/) && !url.match(/.*default_profile_([0-9])_normal\.png/)) {
                    url = url.replace(/_normal\.(jpg||png)/, '.$1');
                }
                else if(url.indexOf('https://graph.facebook.com/') === 0) {
                    if(fullsize)
                        url += "?return_ssl_resources=true&type=large";
                    else
                        url += "?return_ssl_resources=true&type=square";
                }
            }
            return url;
        },

        render: function(config){
            // default to empty
            config = config || {};
            var filteredCollection,
                contactsEl, contactTemplate, contactsHTML,
                searchFilter, addContactToHTML;

            var that = this;

            filteredCollection = this.collection;
            contactsEl = $("#contacts");
            countEl = $("#count");
            contactsEl.html('');
            contactsHTML = "";

            /**
             * Truthy function for filtering down our collection based on config
             * @param c {Object} Contact object
             * @returns {Boolean} Pass or fail
             */
            searchFilter = function(c) {
                // test to see if we have a query, otherwise everything passes
                if (typeof(config.q) == "undefined") return true;
                else config.q = (config.q+'').toLowerCase();

                // make everything lowercase so search isn't case sensititive
                var name = c.get('name');
                if (name) name = name.toLowerCase();
                var email = c.get('email');
                if (email) email = email.toLowerCase();

                //search by name
                if (typeof(name) != "undefined" && name.indexOf(config.q) != -1) return true;

                // search by email
                if(typeof(email) != "undefined" && email.indexOf(config.q) != -1) return true;

                // search by twitter handle
                if(typeof(twitterHandle) != "undefined" && twitterHandle.indexOf(config.q) != -1) return true;

                // search by facebook handle
                if(typeof(facebookHandle) != "undefined" && facebookHandle.indexOf(config.q) != -1) return true;

                return false;
            };

            // I could put this in a script tag on the page,
            // but i kind of like being able to comment lines
            contactTemplate =  '<li class="contact" data-cid="<%= id %>">';
            contactTemplate += '<div class="contactSummary"><img src="<% if (typeof(smPhoto) != "undefined" ) { %><%= smPhoto %><% } else { %>/static/img/lock.png<% } %>"/>';
            contactTemplate += '<strong><% if (typeof(name) != "undefined") { %><%= name %><% } %></strong>';
            contactTemplate += '</div>';
            contactTemplate += '<div class="contactActions">';
            contactTemplate += '<% if (typeof(email) != "undefined") { %><a href="mailto:<%= email %>" target="_b" class="social_link email">Email</a><% } %> ';
            contactTemplate += '<% if (typeof(facebook) != "undefined") { %><a href="<%= facebook %>" class="social_link facebook" target="_b">Facebook Profile</a><% } %>';
            contactTemplate += '<% if (typeof(twitterHandle) != "undefined" && typeof(twitterHandle.data.screen_name) != "undefined") { %><a href="http://twitter.com/<%= twitterHandle.data.screen_name %>" class="social_link twitter" target="_b">Twitter Profile</a><% } %>';
            contactTemplate += '<% if (typeof(github) != "undefined" && typeof(github.data.login) != "undefined") { %><a href="http://github.com/<%= github.data.login %>" class="social_link github" target="_b">GitHub Profile</a><% } %>';
            contactTemplate += '</div>';
            contactTemplate += '<div class="clear"></div></li>';

            addContactToHTML = function(c) {
                // create a simple json obj to use for creating the template (if necessary)
                if (typeof(c.get('html')) == "undefined") {
                    var tmpJSON = c.toJSON();

                    if (typeof(tmpJSON.name) == "undefined") {
                        tmpJSON.name = tmpJSON.email;
                    }
                    tmpJSON.smPhoto = that.getPhoto(tmpJSON, false);
                    tmpJSON.photo = that.getPhoto(tmpJSON, true);
                    tmpJSON.json = JSON.stringify(tmpJSON, null, 2);

                    // cache compiled template to the model
                    var compiledTemplate = _.template(contactTemplate, tmpJSON);
                    c.set({'html': compiledTemplate});
                    contactsEl.append(compiledTemplate);
                    // contactsHTML += compiledTemplate;
                } else {
                    // just get the rendered html from our model
                    contactsEl.append(c.get('html'));
                }
            };

            var tmp = filteredCollection.filter(searchFilter);

            var sortFn = function(c) {
                if (c.get(that.sortType)) {
                    return c.get(that.sortType);
                }
                return "zzz"; // force to the end of the sort
            };

            tmp = _.sortBy(tmp, sortFn);
            _.each(tmp, addContactToHTML);
            
            countEl.html(tmp.length);
            
            if ($('.contact').length === 1) {
                this.drawDetailsPane($('.contact').data('cid'));
                $('.contact').addClass('clicked');
            } else if ($('.detail').is(':visible')) {
                var selectedContact = $(".contact[data-cid='" + displayedContact + "']");
                if (selectedContact.length > 0) {
                    selectedContact.addClass('clicked');
                } else {
                    this.hideDetailsPane();
                }
            }
        }
    });
    var listView = new ListView();
    var sideView = new SideView();
});
