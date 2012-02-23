WakeMate is a sleep tracking device: http://wakemate.com/

The connector is still a stub, built during the QS Locker Hackathon in San Francisco on July 13th, 2011.

Requirements:
* ruby
* gem install json
* gem install mechanize

What you can do so far:
* export WAKEMATE_EMAIL=you@example.com
* export WAKEMATE_PASSWORD=secret
* start locker
* go to Connectors and select "Show Unstable" in the top right corner
* follow Wakemate Account and click on Install
* You'll get an error message like "Unable to get Go action", ignore it
* look at the console output for the port number, e.g. sending wakemate startup info of {"port":18043...
* point your browser at http://localhost:18043/getAllCurrent
* you should see your wakemate history in JSON format

So there's a bit of work left:

These are the next steps:

* create a visual interface in Locker that asks and stores the username and password
* store the result in Mongo (as a local cache, so we don't end up hammering Wakemate.com each time an application wants our data)
* basic visualization app (Google charts?)
* check for new data once or twice a day automatically

Things Wakemate could do to make life better:
* create a RESTful API
* allow download of specific date range
* provide more detailed data

I may not have time for this anytime soon, but feel free to contact me with questions:

Sjors Provoost
sjors@sprovoost.nl
http://sprovoost.nl/
http://twitter.com/provoost
http://nl.linkedin.com/in/provoost