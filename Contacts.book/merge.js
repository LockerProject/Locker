// merge contacts from journals
var fs = require('fs'),
    crypto = require('crypto');

var fb_json = "../Facebook.journal/my/contacts.json";
var fb_dir = "../Facebook.journal/my/";
var gc_dir = "../gcontacts.journal/my/";
var ab_json = "../osxAddressBook.journal/my/contacts.json";

var ccount = 0;
var contacts = {};
var debug = false;

function cadd(c, source) {
    if(!c)
        return;
        
    morphContact(c, source);
    var key;
    if(c.name)
        key= c.name.replace(/[A-Z]\./g, '').toLowerCase().replace(/\s/g, '');
    else if(c.email && c.email.length > 0)
        key = c.email[0].value;
    else {
        var m = crypto.createHash('sha1');
        m.update(JSON.stringify(c));
        key = m.digest('base64');
    }
    console.log('key = ' + key);
    if (contacts[key]) {
        // merge
        mergeContacts(contacts[key], c);
    } else {
        contacts[key] = c;
        ccount++;
    }
}

function morphContact(c, source) {
    if(source.type == 'google_contacts' || source.type == 'facebook') {
        console.log('adding pic ' + c.id);
        c.pic = [source.account + '/' + c.id + '.jpg'];
    }
}

function linkPhotos(sourceDir, accountID) {
    try {
        fs.mkdirSync(process.cwd() + '/my/photos', 0755);
    } catch (err) {}
    try {
        var files = fs.readdirSync(sourceDir);
    } catch(err) {
        return;
    }
    if(!files)
        return null;
    try {
        fs.mkdirSync('my/photos/' + accountID, 0755);
    } catch(err) {
        return;
    }
    for(var i = 0; i < files.length; i++) {
        fs.linkSync(sourceDir + '/' + files[i], 'my/photos/' + accountID + '/' + files[i]);
    }
}


/**
 * name
 * email
 * phone
 * address
 * pic (avatar)
 */
function mergeContacts(one, two) {
    mergeArrayInObjects(one, two, "email", function(obj1, obj2) {
        return obj1.value.toLowerCase() == obj2.value.toLowerCase();
    });
    mergeArrayInObjects(one, two, "phone", function(obj1, obj2) {
        return obj1.value.replace(/[^0-9]/g,'').toLowerCase() ==
               obj2.value.replace(/[^0-9]/g,'').toLowerCase();
    });
    mergeArrayInObjects(one, two, "address", function(obj1, obj2) {
        return obj1.value.replace(/[,\s!.#-()@]/g,'').toLowerCase() == 
               obj2.value.replace(/[,\s!.#-()@]/g,'').toLowerCase();
    });
    mergeArrayInObjects(one, two, "pic",  function(obj1, obj2) {return false;});
}

/**
 * Merge two arrays of the name arrayName in two objects
 */
function mergeArrayInObjects(obj1, obj2, arrayName, entriesAreEqual) {
    if(obj1[arrayName]) {
        if(obj2[arrayName]) {
            mergeArrays(obj1[arrayName], obj2[arrayName], entriesAreEqual);
        }
    } else if(obj2[arrayName]) {
        obj1[arrayName] = obj2[arrayName];
    }
}

/**
 * Merge two arrays, removing duplicates that match based on equals function
 */
function mergeArrays(one, two, entriesAreEqual) {
    for(var i = 0; i < two.length; i++) {
        var present = false;
        for(var j = 0; j < one.length; j++) {
            if(entriesAreEqual(one[j], two[i]))
                present = true;
        }
        if(!present)
            one.push(two[i]);
    }
}


/**
 * Reads in a file (at path), splits by line, and parses each line as JSON.
 * return parsed objects in an array
 */
function parseLinesOfJSONFile(path) {
    var objects = [];
    var cs = fs.readFileSync(path, 'utf-8').split("\n");
    for (var i = 0; i < cs.length; i++) {
        if (cs[i].substr(0, 1) != "{") continue;
        if(debug) console.log(cs[i]);
        objects.push(JSON.parse(cs[i]));
    }
    return objects;
}

/**
 * Read in files from Facebook.journal
 */
addAccountsFromDirectory(fb_dir, 'facebook');


/**
 * Read in files from osxAddressBook.journal
 */
if (fs.statSync(ab_json)) {
    var cs = parseLinesOfJSONFile(ab_json);
    for (var i = 0; i < cs.length; i++) {
        cadd(cs[i], {type: 'address_book'});
    }
}

function addContactsFromFile(path, type, account) {
    if (fs.statSync(path)) {
        var cs = parseLinesOfJSONFile(path);
        for (var i = 0; i < cs.length; i++) {
            cadd(cs[i], {type: type, account: account});
        }
    }
}

function addAccountsFromDirectory(base_dir, type) {
    var files = fs.readdirSync(base_dir);
    for (var i = 0; i < files.length; i++) {
        var fullPath = base_dir + '/' + files[i];
        var stats = fs.statSync(fullPath);
        if(!stats.isDirectory())
            continue;
        addContactsFromFile(fullPath + '/contacts.json', type, files[i]);
        linkPhotos(fullPath + '/photos', files[i]);
    }
}

/**
 * Read in files from gcontacts.journal
 */
 addAccountsFromDirectory(gc_dir, 'google_contacts');

var stream = fs.createWriteStream("my/contacts.json");
for (var c in contacts) {
    stream.write(JSON.stringify(contacts[c]) + "\n");
}
stream.end();


console.log("got " + ccount + " contacts");
