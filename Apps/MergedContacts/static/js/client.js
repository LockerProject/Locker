var log = function(msg) { if (console && console.log) console.debug(msg); };
var displayedContact = '';
var baseUrl = '';

var hack = false;
var total = 0;
$(function() {

    $('a', $('.detail')).live('click', function() {
        top.location.href = $(this).attr('href');
    });

    $(document).keydown(function(e) {
        // disable enter
        if (e.keyCode === 13) return false;
        // esc key
        if (e.keyCode === 27) {
            return hack.loadAll();
        }
        if ($('.clicked').length != 0) {
          // TODO this logic is lame, need to port over my ListView class that does this correctly (justin)
            // down arrow
            if (e.keyCode === 40) {
                if ($('.clicked').next().length != 0) {
                    $('.clicked').next().click();
                    $("#main").scrollBy(0, $("#contacts li:first-of-type").outerHeight());
                    return false;
                }
            // up arrow
            } else if (e.keyCode === 38) {
                if ($('.clicked').prev().length != 0) {
                    $('.clicked').prev().click();
                    $("#main").scrollBy(0, -$("#contacts li:first-of-type").outerHeight());
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

        events: {
            'click #showAllLink' : 'loadAll',
            'hover #contacts li' : 'hoverContactHandler',
            'click #contacts li' : 'clickContactHandler',
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
                $.getJSON(baseUrl + '/Me/contacts/id/' + cid, function(contact) {
                    model.set({detailedData : contact});
                    self.updateDetails(contact);
                });
            } else {
                self.updateDetails(model.get('detailedData'));
            }
        },

        hideDetailsPane: function() {
            displayedContact = '';
            // $('aside').css('z-index', -1);
            // $('#main').stop().animate({
            //     marginRight: '0px'}, 750, function() {
            //         $('.detail').hide();
            //     })
            return $('.clicked').removeClass('clicked');
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
                if(contact.accounts.instagram) {
                    newContact.set({instagram: contact.accounts.instagram[0]});
                }
                if(contact.accounts.flickr) {
                    newContact.set({flickr: contact.accounts.flickr[0]});
                }
            }

            this.collection.add(newContact); // add item to collection; view is updated via event 'add'
        },

        initialize: function(){
            _.bindAll(this, 'load', 'render', 'addContact', 'loadSearch', 'loadSince', 'loadView'); // fixes loss of context for 'this' within methods
            that = this;

            that.collection = new AddressBook();

            console.log(window.location);
            if (window.location.hash.substr(0,4) == "#new") {
                that.loadSince(window.location.hash.substr(5));
            } else if (window.location.hash.substr(0,5) == "#view") {
                that.loadView(window.location.hash.substr(6));
            } else if (window.location.hash.substr(0,7) == "#search") {
                that.loadSearch(window.location.hash.substr(8))
            } else {
                that.loadAll();
            }

            $.getJSON(baseUrl + '/Me/contacts/state', {}, function(state) {
                total = state.count;
                $("#count").html(total);
            });
        },

        loadAll: function loadAll() {
            $("#appHeader h1").text("People");
            $("#appHeader .showAll").hide();
            this.hideDetailsPane();

            this.offset = 0;
            if(!hack) hack = this;
            $("#main").scroll(function(){
              if  (($("#main").offset().top + $("#main").scrollTop()) >= ($("#main ul").height() - $("#main").height() - 250)){
                hack.load(function(){});
              }
            });
            this.collection._reset();
            this.load(function() {});
        },

        loadSince: function loadSince(objId) {
            var self = this;
            if(!hack) hack = this;
            $.getJSON(baseUrl + "/Me/contacts/since", {id:objId}, function(contacts) {
                $("#appHeader h1").text(contacts.length + " New " + (contacts.length == 1 ? "Person" : "People"));
                $("#appHeader .showAll").show();
                // $("#newHeader").show();
                for(var i in contacts) {
                    self.addContact(contacts[i]);
                }
                self.render();
            })
        },

        loadView: function loadView(objId) {
            var self = this;
            if(!hack) hack = this;
            $.getJSON(baseUrl + "/Me/contacts/id/"+objId, function(contact) {
              // $("#newCount").text("Showing 1 Person");
                $("#appHeader h1").text("Showing 1 Person");
                $("#appHeader .showAll").show();
                // $("#newHeader").show();
                self.addContact(contact);
                self.render();
            })
        },

        /**
         * Load the contacts data (get contacts)
         * @param callback
         */
        load: function load(callback) {
            var that = this;
            //log("loading "+that.offset);
            if(!callback) callback = function(){};
            if(that.offset > total) return callback();
            if(that.loading) return callback();
            that.loading = true;
            var baseURL = baseUrl + '/query/getContact';
            var fields = "['_id','addresses','emails','name','phoneNumbers','photos','accounts.facebook.data.link'," +
                         "'accounts.foursquare.data.id','accounts.github.data.login','accounts.instagram.data.username','accounts.twitter.data.screen_name'," +
                         "'accounts.flickr.data.username','accounts.flickr.data.nsid']";
            var sort = '\'{"firstnamesort":1}\'';
            var terms = "[firstnamesort:\"a\"+]";

            $.getJSON(baseURL, {offset:that.offset, limit: 50, fields: fields, sort: sort, terms: terms}, function(contacts) {
                that.loading = false;
                for(var i in contacts) {
                    that.addContact(contacts[i]);
                }
                that.render();
                that.offset += 50;
                return callback();
            });
        },

        /**
         * Load the contacts data from a search result
         * @param callback
         */
        loadSearch: function loadSearch(q) {
            var that = this;
            if(!hack) hack = this;
            // $("#newCount").text("Showing Search Results");
            $("#appHeader h1").text("Showing Search Results");
            $("#appHeader .showAll").show();
            // $("#newHeader").show();
            log("searching "+q);
            that.collection._reset();
            var baseURL = baseUrl + '/Me/search/query';
            var type = 'contact*';

            $.getJSON(baseURL, {q: q + "*", type: type, limit: 20}, function(results) {
                for(var i in results.hits) {
                    that.addContact(results.hits[i].fullobject);
                }
                that.render({q:q}); // additionally filter
                return;
            });
        },

        /**
         * Update the details panel with a given contact
         * @param the object containing all of the information about the contact
         */
        updateDetails: function(contact) {
            $('.name').text(contact.name);
            $('.photo').attr('src', this.getPhoto(contact, true));
            $('.contact-details').show();
            $('.social-details').show();
            // twitter
            if (contact.accounts.twitter && contact.accounts.twitter[0].data) {
                var twitter = contact.accounts.twitter[0].data;
                $('.twitterhandle').attr('href', 'http://www.twitter.com/' + twitter.screen_name);
                $('.twitterhandle').text('@' + twitter.screen_name);
                // $('.lasttweet').text(twitter.status.text);
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
              console.log("blah")
                var fb = contact.accounts.facebook[0].data;
                $('.facebookHandle').attr('href', fb.link);
                $('.facebookHandle').text(fb.name);
                $('.facebookSection').show();
            } else {
                $('.facebookSection').hide();
            }
            // flickr
            if (contact.accounts.flickr && contact.accounts.flickr[0].data) {
                var flickr = contact.accounts.flickr[0].data;
                $('.flickrHandle').attr('href', flickr.link);
                $('.flickrHandle').text(flickr.username);
                $('.flickrSection').show();
            } else {
                $('.flickrSection').hide();
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
                $('.empty').fadeOut();
                $('.detail').fadeIn();
                // $('#main').stop().animate({
                //     marginRight: '374px'}, 750, function() {
                //         $('aside').css('z-index', 1);
                //     });
            }
            // Hide empty contact / social details sections, if necessary
            $('.contact-details li:visible').length == 0 ? $('.contact-details').hide() : $('.contact-details').show();
            $('.social-details li:visible').length == 0 ? $('.social-details').hide() : $('.social-details').show();
            console.log($('.social-details li:visible'))
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
            log("rendering "+config.q);
            var contactsEl, contactTemplate, contactsHTML, addContactToHTML;

            var that = this;

            contactsEl = $("#contacts");
            contactsEl.html('');
            contactsHTML = "";

            // I could put this in a script tag on the page,
            // but i kind of like being able to comment lines
            contactTemplate =  '<li class="contact" data-cid="<%= id %>">';
            contactTemplate += '  <div class="contact-avatar"><img src="<% if (typeof(smPhoto) != "undefined" ) { %><%= smPhoto %><% } else { %>/static/img/lock.png<% } %>"/></div>';
            contactTemplate += '  <div class="contact-name"><% if (typeof(name) != "undefined") { %><%= name %><% } %></div>';
            contactTemplate += '  <div class="contact-actions">';
            contactTemplate += '    <% if (typeof(email) != "undefined") { %><a href="mailto:<%= email %>" target="_blank" class="social_link email">Email</a><% } %> ';
            contactTemplate += '    <% if (typeof(facebook) != "undefined") { %><a href="<%= facebook %>" class="social_link facebook" target="_blank">Facebook Profile</a><% } %>';
            contactTemplate += '    <% if (typeof(twitterHandle) != "undefined" && typeof(twitterHandle.data.screen_name) != "undefined") { %><a href="http://twitter.com/<%= twitterHandle.data.screen_name %>" class="social_link twitter" target="_blank">Twitter Profile</a><% } %>';
            contactTemplate += '    <% if (typeof(flickr) != "undefined" && typeof(flickr.data.username) != "undefined") { %><a href="http://flickr.com/people/<%= flickr.data.nsid %>" class="social_link flickr" target="_blank">Flickr Profile</a><% } %>';
            contactTemplate += '    <% if (typeof(foursquare) != "undefined" && typeof(foursquare.data.id) != "undefined") { %><a href="http://foursquare.com/user/<%= foursquare.data.id %>" class="social_link foursquare" target="_blank">Foursquare Profile</a><% } %>';
            contactTemplate += '    <% if (typeof(github) != "undefined" && typeof(github.data.login) != "undefined") { %><a href="http://github.com/<%= github.data.login %>" class="social_link github" target="_blank">GitHub Profile</a><% } %>';
            contactTemplate += '    <% if (typeof(instagram) != "undefined" && typeof(instagram.data.username) != "undefined") { %><a href="http://listagr.am/n/<%= instagram.data.username %>" class="social_link instagram" target="_blank">Instagram Pics</a><% } %>';
            contactTemplate += '  </div>';
            contactTemplate += '</li>';

            addContactToHTML = function(c) {
                // create a simple json obj to use for creating the template (if necessary)
                if (typeof(c.get('html')) == "undefined") {
                    var tmpJSON = c.toJSON();

                    if (typeof(tmpJSON.name) == 'undefined' && typeof(tmpJSON.email) == 'undefined') {
                        return;
                    }

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

            _.each(that.collection.filter(function(){return true;}), addContactToHTML);
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
