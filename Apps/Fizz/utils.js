// e.g. s = '2010-11-11T10:26:38+0000'
// returns time as Number in ms
function parseFBDate(s) {
    // convert to numbers and throw away the timezone
    var parts = s.match(/\d+/g).map(Number).slice(0,-1);
    parts[1] -= 1; // month madness
    return Date.UTC.apply(null,parts);
}

function formatDate(ms) {
    if (ms instanceof Date) ms = ms.getTime();
    var now = new Date().getTime();
    var timeAgo = Math.floor((now - ms) / 1000);
    if (timeAgo < 60) {
        return "about " + timeAgo + " second" + (timeAgo == 1 ? "" : "s") + " ago";
    }
    timeAgo = Math.floor(timeAgo / 60);
    if (timeAgo < 60) {
        return "about " + timeAgo + " minute" + (timeAgo == 1 ? "" : "s") + " ago";
    }
    timeAgo = Math.floor(timeAgo / 60);
    if (timeAgo < 24) {
        return "about " + timeAgo + " hour" + (timeAgo == 1 ? "" : "s") + " ago";
    }
    timeAgo = Math.floor(timeAgo / 24);
    if (timeAgo < 7) {
        return "about " + timeAgo + " day" + (timeAgo == 1 ? "" : "s") + " ago";
    }
    timeAgo = Math.floor(timeAgo / 7);
    return "about " + timeAgo + " week" + (timeAgo == 1 ? "" : "s") + " ago";
}