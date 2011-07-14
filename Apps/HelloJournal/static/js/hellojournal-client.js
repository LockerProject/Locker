/* Generic log function for debugging. */
var log = function(msg) { if (console && console.log) console.debug(msg); };

/**
 * Reload the display (get journal, render them)
 * @property offset {Integer} Optional Where in the journal collection you want to start.
 * @property limit {Integer} Optional The number of journal you want returned.
 * @property useJSON {Boolean} Optional Display raw JSON instead of the journal's name.
 */
function reload(offset, limit, useJSON) {
    // set the params if not specified
    var offset = offset || 0; 
    var limit = limit || 100;
    var useJSON = useJSON || false;

    var getJournalsCB = function(journals) {
	// find the unordered list in our document to append to
        var journalList = $("select:first");

	// clear the list
	journalList.html('');
	
	// populate the list with our journal
	if (journals.length == 0) journalList.append("<option>Sorry, no journal(s) found!</option>");
        for (var i in journals) {
	    var journal = journals[i];
	    
	    log(journal);

	    // get the journal name, but use the first email address if no name exists
	    var journalHTML = journal.id;
            
	    var optHTML = '<option id="' + journal._id + '" class="journal">'+journalHTML+'</div>';
	    journalList.append(optHTML);
	}
    };

    $.getJSON(
	'getJournals', 
	{}, 
	getJournalsCB
    );
}

/* jQuery syntactic sugar for onDomReady */
$(function() {
    reload(0, 9000, true);
});
