WakeMate is a sleep tracking device: http://wakemate.com/

The connector is still a stub, built during the QS Locker Hackathon in San Francisco on July 13th, 2011.

What you can do so far:
* edit Connectors/Wakemate/wakemate.connector and change "unstable" to "stable"
* start locker
* go to Services -> Wakemate Account
* click Install Connector
* It should appear in the bottom left, click on it
* look at the console output for the port number, e.g. sending wakemate startup info of {"port":18043...
* point your browser at http://localhost:18043/getAllCurrent
* you should see [{"date":"2011-07-12T03:55:18Z","sleep_score":50},{"date":"2011-07-13T03:55:18Z","sleep_score":80}]

So there's a bit of work left. The goal is to ask for the Wakemate username 
and password, then go and get the CSV file. It should check once or twice a day for new data.

These are the next steps:

* spawn a ruby process and make that return the fake data, see: http://stackoverflow.com/questions/5358105/ruby-subprocess-with-node-js
* use Mechanize and a hard coded username and password to fetch the CSV file
* convert CSV to json
* create a visual interface in Locker that asks and stores the username and password
* store the result in Mongo (as a local cache, so we don't end up hammering Wakemate.com each time an application wants our data)

I may not have time for this anytime soon, but feel free to contact me with questions:

Sjors Provoost
sjors@sprovoost.nl
http://sprovoost.nl/
Twitter: @provoost