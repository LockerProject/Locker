/**
 * String#interpolate(values, syntax) -> String
 *
 * Based on String#supplant() by Douglas Crawford:
 *
 *   http://javascript.crockford.com/remedial.html
 *
**/
if (!String.prototype.interpolate)
{
  String.prototype.interpolate = function (values, syntax)
  {
    if (!syntax) syntax = /{([^{}]*)}/g
    return this.replace(syntax,
      function (a, b)
      {
        var r = values[b];
        return typeof r === "string" || typeof r === "number" ? r : a;
      }
    );
  }
}

/**
 * String#toDate() -> Date
 *
 * Returns the current String as an instance of Date.
**/
String.prototype.toDate = function()
{
  var date, parts, year, month, day, hours, minutes, seconds, ms;

  // Check for ISO 8601 dates
  if (parts = this.match(/^([0-9]{4})\-([0-9]{2})\-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(\.([0-9]{1,3}))?(Z|([-+0-9:]{6}))$/))
  {
    date = Date.parse(this);

    if (isNaN(date)) // ISO-8601 Parsing Unsupported...
    {
      year    = parts[1];
      month   = parts[2];
      day     = parts[3];
      hours   = parts[4];
      minutes = parts[5];
      seconds = parts[6];
      ms      = parts[8] || 0;
      tz      = parts[10] || false;

      if (tz)
      {
        var dateString = Date.shortMonthNames[month - 1] + " " + day + ", " + year + " " + hours + ":" + minutes + ":" + seconds + " GMT" + tz.gsub(":", "");
        date = new Date(Date.parse(dateString));
      }
      else
        date = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds, ms));
    }
    else
      date = new Date(date);
  }

  // Pass-through all other date formats...
  else
    date = new Date(this.toString());

  return date;
}
