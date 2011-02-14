Developer Quickstart
====================

* Every runnable thing within the locker is it's own web service
* The moving parts are: sources, sinks, collections, and apps
* The locker ops code does the work to create contexts for these to work in and schedule/run them as needed
* A collection knows what sources it can "run" and what contexts to run them in in order to get data
* Sources are probably the best way to add value fast to the platform, the more places we enable getting data from the better
* When something is started, it is given a filename that has it's (json) config options for what it is supposed to be doing
* Each thing also has a json file that describes itself to the system
* To start, only node, python, and ruby are supported, and please don't duplicate one in another language unless the first is fully untenable


NOTES
=====

Very raw braindump notes:

- Foo.app, Bar.connector, etc, any dir can have any number of each, scanned upon discovery/update

A "service types" system, mimic mime types for collections/connectors, connectors list what they require and produce, apps can list what types they need to work

Collections - a connector advertises which type it produces (page/safari-bookmark), and that type has a spec of common attributes expected within the data for the first part (page), the second part should describe the native format from the source of the data (safari-bookmark)
	place/facebook
	place/foursquare
	photo/flickr
	contact/addressbook
	page/safari-bookmark
	page/safari-history
