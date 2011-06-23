var log = function(msg) { if (console && console.log) console.debug(msg); }

$(function() {

    var example = 
	{"_id":"4df024696a35e24d730a5470",
	 "_matching":{"cleanedNames":["alex kawas"]},
	 "accounts":{
	     "facebook":[
		 {
		     "data":{
			 "_id":"4dee617705ab406bcd57df01",
			 "id":"3324802",
			 "name":"Alex Kawas",
			 "first_name":"Alex","last_name":"Kawas",
			 "link":"http://www.facebook.com/kawas.alex",
			 "username":"kawas.alex",
			 "gender":"male",
			 "locale":"en_US",
			 "updated_time":1307085471
		     },
		     "lastUpdated":"1307583593099"}
	     ]
	 },
	 "name":"Alex Kawas",
	 "photos":["https://graph.facebook.com/3324802/picture"]
	}
    
    var Contact = Backbone.Model.extend({
	defaults: {}
    });      

    var AddressBook = Backbone.Collection.extend({
	model: Contact
    });

    var ListView = Backbone.View.extend({ 
	el: $('body'), // attaches `this.el` to an existing element.

	events: {
	    'keyup input#search': 'searchChangeHandler'
	},
	
	searchChangeHandler: function() {
	    var q = $("input#search").val();
	    if (q.length > 0) {
		this.render({q: q})
	    } else {
		this.render();
	    }
	},

	addContact: function(cObj) {
	    var newContact = new Contact();
	    
	    newContact.set({
		name: cObj.name,
		id: cObj._id
	    });

	    if (cObj.emails) {
		newContact.set({
		    email: cObj.emails[0].value
		});
	    }

	    if (cObj.accounts && cObj.accounts.facebook && cObj.accounts.facebook[0] && cObj.accounts.facebook[0].data && cObj.accounts.facebook[0].data.link) {
		newContact.set({
		    facebookLink: cObj.accounts.facebook[0].data.link
		});
	    }

	    
	    if (cObj.photos) {
		newContact.set({
		    photos: cObj.photos
		});
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
	    _.bindAll(this, 'searchChangeHandler', 'load', 'render', 'addContact'); // fixes loss of context for 'this' within methods

	    this.collection = new AddressBook();
//	    this.collection.bind('add', this.appendContact); // collection event binder
	    
	    this.load();
	},

	/**
	 * Load the contacts data (get contacts)
	 * @param callback
	 */
	load: function load(callback) {
	    var that = this;
	    var baseURL = 'http://localhost:8042/query';

	    var getContactsCB = function(contacts) {
		if (contacts.length > 10000) {
		    alert("Whoha... that's a lot of contacts!");
		}
		for(var i in contacts) {
		    // only add contacts if they have a name or email. might change this.
		    if (contacts[i].emails || contacts[i].name) {
			that.addContact(contacts[i]);
		    } else {
		    }
		}
		// todo, add sorting
		// that.contacts.sort(function(s))
		that.render();
	    };
	    
	    // chunk it for the very start, want instant results
	    $.getJSON(baseURL + '/getContact', {offset:0, limit:100}, getContactsCB);
	    // $.getJSON(baseURL + '/getContact', {offset:100, limit:200}, getContactsCB);
	    $.getJSON(baseURL + '/getContact', {offset:100, limit:10001}, getContactsCB);
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
		if(fullsize && url.match(/_normal\.(jpg||png)/) && !url.match(/.*default_profile_([0-9])_normal\.png/))
		    url = url.replace(/_normal\.(jpg||png)/, '.$1');
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
		if (typeof(name) != "undefined" &&
		    name.indexOf(config.q) != -1) return true;
		
		// search by email
		if(typeof(email) != "undefined" &&
		   email.indexOf(config.q) != -1) return true;
		
		// search by twitter handle
		// TODO
		
		// search by facebook handle
		// TODO
		
		return false;
	    }

	    // I could put this in a script tag on the page, 
	    // but i kind of like being able to comment lines
	    contactTemplate = '<li class="contact">';
	    contactTemplate += '<img src="<% if (typeof(smallPhoto) != "undefined" ) { %><%= smallPhoto %><% } else { %>/static/img/lock.png<% } %>" style="height: 30px; width: 30px;"/>';
	    contactTemplate += '<strong><% if (name) { %><%= name %><% } else { %><% } %></strong>';
	    contactTemplate += '<% if (typeof(email) != "undefined") { %><a href="mailto:<%= email %>">email</a><% } %> ';
	    contactTemplate += '<% if (typeof(facebookLink) != "undefined") { %><a href="<%= facebookLink %>">facebook</a><% } %>';
	    //	    contactTemplate += '<br/><pre><%= json %></pre>';
	    contactTemplate += '</li>';
	    
	    addContactToHTML = function(c) {
		// create a simple json obj to use for creating the template (if necessary)
		if (typeof(c.get('html')) == "undefined") {
		    var tmpJSON = c.toJSON();
		    log(this.getPhotoUrl(tmpJSON, true);
		    if (tmpJSON.photos && tmpJSON.photos[0]) {
			tmpJSON.smallPhoto = tmpJSON.photos[0]
		    }
		    tmpJSON.json = JSON.stringify(tmpJSON);
		    
		    // cache compiled template to the model
		    var compiledTemplate = _.template(contactTemplate, tmpJSON);
		    c.set({'html': compiledTemplate});
		    contactsHTML += compiledTemplate;
		} else {
		    // just get the rendered html from our model
		    contactsHTML += c.get('html');
		}
	    }

	    var tmp = filteredCollection.filter(searchFilter);
	    _.each(tmp, addContactToHTML);
	    contactsEl.html(contactsHTML);
	    countEl.html(tmp.length);
	}
    });
    var listView = new ListView();
});
