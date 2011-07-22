/* Generic log function for debugging. */
var log = function(msg) { if (console && console.log) console.debug(msg); };

/**
 * Reload the display (get journal, render them)
 */
function reload() {
    var journalList = $("select:first");

    var getJournalsCB = function(journals) {
	// find the unordered list in our document to append to

	// clear the list
	journalList.html('');
	
	// populate the li`ast with our journal
	if (journals.length == 0) journalList.append("<option>Sorry, no journal(s) found!</option>");
        for (var i in journals) {
	    var journal = journals[i];
	    
	    log(journal);

	    // get the journal name, but use the first email address if no name exists
	    var journalHTML = journal.id;
            
	    var optHTML = '<option id="' + journal._id + '" class="journal">'+journalHTML+'</div>';
	    journalList.append(optHTML);
	}
        journalList.attr("disabled", false);
    };

    var getJournalCB = function(journal) {
        
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
