var log = function(msg) { if (console && console.log) console.debug(msg); };

$(function() {
    
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
            'keyup input#search': 'searchChangeHandler',
            'change #sort': 'sortChangeHandler',
            'click input#showJSON': 'showJSONHandler',

            'hover #contacts li': 'hoverContactHandler',
            'click #contacts li': 'clickContactHandler',
            'focus #search': 'focusSearchHandler',
            'blur #search': 'blurSearchHandler'
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

        showJSONHandler: function() {
            var showJSONEl = $("#showJSON:checked");
            var contactsEl = $("ul#contacts");
            if (showJSONEl.length) contactsEl.addClass("showJSON");
            else contactsEl.removeClass("showJSON");
        },

        hoverContactHandler: function() {
            log("c hover");
        },

        clickContactHandler: function() {
            log("c click");
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

            newContact.set({
            name: contact.name,
            id: contact._id
            });

            // copy email
            if (contact.emails) {
                var email = contact.emails[0].value;
                if (email) newContact.set({email: email});
            }

            // copy photos
            if (contact.photos) newContact.set({photos: contact.photos});

            // copy accounts (twitter, github, facebook, foursquare)
            if(contact.accounts) {
                if(contact.accounts.twitter)
                    newContact.set({twitterHandle: contact.accounts.twitter[0]});
                if(contact.accounts.github)
                    newContact.set({github: contact.accounts.github[0]});
                if(contact.accounts.facebook) {
                    newContact.set({
                        firstname: contact.accounts.facebook[0].data.first_name,
                        lastname: contact.accounts.facebook[0].data.last_name,
                        facebookName: contact.accounts.facebook[0].data.name,
                        facebookName: contact.accounts.facebook[0].data.name,
                        facebookLink: contact.accounts.facebook[0].data.link,
                        sex: contact.accounts.facebook[0].data.gender
                    });
                }
                if(contact.accounts.googleContacts) {
                    // nothing for now, no unique data
                }
                if(contact.accounts.foursquare) {
                    newContact.set({
                        foursquare: contact.accounts.foursquare[0]
                    });
                }
            }

            this.collection.add(newContact); // add item to collection; view is updated via event 'add'
        },

        appendContact: function(contact) {
            var contactHTML = '<div class="contact">';
            if (contact.get('name')) {
                contactHTML += contact.get('name') + "<br/>";
            }
            if (contact.get('email')) {
                contactHTML += contact.get('email') + "<br/>";
            }

            //$("#contacts").append(contactHTML);
        },

        initialize: function(){
            _.bindAll(this, 'sortChangeHandler', 'focusSearchHandler', 'blurSearchHandler', 'searchChangeHandler', 'load', 'render', 'addContact'); // fixes loss of context for 'this' within methods
            that = this;

            this.collection = new AddressBook();
            //this.collection.bind('add', this.appendContact); // collection event binder

            // TODO: clean up so the search is a proper view.
            that.blurSearchHandler();
            this.load(function() {
                $("#searchBox").slideDown();
                $("#contacts").show();
            });
        },

        /**
         * Load the contacts data (get contacts)
         * @param callback
         */
        load: function load(callback) {
            var that = this;
            var baseURL = '/query';

            var getContactsCB = function(contacts) {
                if (contacts.length > 3000) {
                    alert("Whoha... that's a lot of contacts! Please be patient.");
                }
                for(var i in contacts) {
                    // only add contacts if they have a name or email. might change this.
                    if (typeof(contacts.account) != "undefined" && typeof(contacts.account.facebook) != "undefined") log(contacts[i]);
                    if (contacts[i].emails || contacts[i].name) {
                        that.addContact(contacts[i]);
                    }
                }
                that.render();
            };

            // chunk it for the very start, want instant results
            // TODO: paginate loading (probably 500 per set)
            $.getJSON(baseURL + '/getContact', {offset:0, limit:100}, getContactsCB);
            $.getJSON(baseURL + '/getContact', {offset:100, limit:10000}, function(c) { getContactsCB(c); callback(); });
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
            if(contact.addresses && contact.addresses) {
                for(var i in contact.addresses) {
                    if(contact.addresses[i].type === 'location') {
                        return contact.addresses[i].value;
                    }
                }
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
                        url = url += "?return_ssl_resources=1&type=large";
                    else
                        url = url += "?return_ssl_resources=1&type=square";
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
            contactTemplate += '<div class="contactSummary"><img src="<% if (typeof(smPhoto) != "undefined" ) { %><%= smPhoto %><% } else { %>/static/img/lock.png<% } %>" style=""/>';
            contactTemplate += '<strong><% if (typeof(name) != "undefined") { %><%= name %><% } %></strong>';
            contactTemplate += '<% if (typeof(sex) != "undefined") { %><br/><%= sex %><% } %>';
            contactTemplate += '</div>';
            contactTemplate += '<div class="contactActions">';
            contactTemplate += '<% if (typeof(email) != "undefined") { %><a href="mailto:<%= email %>" target="_b" class="social_link email">Email</a><% } %> ';
            contactTemplate += '<% if (typeof(facebookLink) != "undefined") { %><a href="<%= facebookLink %>" class="social_link facebook" target="_b">Facebook Profile</a><% } %>';
            contactTemplate += '<% if (typeof(twitterHandle) != "undefined" && typeof(twitterHandle.data.screen_name) != "undefined") { %><a href="http://twitter.com/<%= twitterHandle.data.screen_name %>" class="social_link twitter" target="_b">Twitter Profile</a><% } %>';
            contactTemplate += '<% if (typeof(github) != "undefined" && typeof(github.data.login) != "undefined") { %><a href="http://github.com/<%= github.data.login %>" class="social_link github" target="_b">GitHub Profile</a><% } %>';
            contactTemplate += '</div>';
            contactTemplate += '<br/><pre><%= json %></pre>';
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
                    contactsHTML += compiledTemplate;
                } else {
                    // just get the rendered html from our model
                    contactsHTML += c.get('html');
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

            contactsEl.html(contactsHTML);
            countEl.html(tmp.length);
        }
    });
    var listView = new ListView();
    var sideView = new SideView();
});
