Developer Quickstart
====================

* Every runnable thing within the locker is its own web service (written in node, python, and ruby to start)
* There is a core web service that coordinates stuff and handles startup, scheduling, etc
* The types of services are generally: connectors, collections, and apps
* Any service once it's "installed" is assigned its own local directory for storing anything
* Connectors are probably the best way to add value fast to the platform, the more places we enable getting data from the better

Connectors
==========

* Fundamental goal: mirror/sync data from somewhere else
* Store that data in JSON in as identical-to-the-source structure as possible
* Structure the data in a simple archival way, take the long-view
* Serve it back up via as simple of a RESTful API as possible, just make it accessible in bulk upon request
* Be OK with being turned off anytime (graceful start)
* Identify your data to the locker via simple service types (below)
* Generate event notifications when data changes

Collections
===========

* General common data-types, one Collection per type (places, contacts, links, messages, music, photos, etc)
* Need to know how to speak service-types specific to the diverse set of connectors, understand the raw data formats
* Embody the intelligence to merge and dedup from many sources, and handle local meta-data around each datum.
* Register for event notifications to stay up to date efficiently
* Many will consume-from / feed-to other Collections
* Preserve and convey the context of where the data came from ("via")
* Be able to cold start from scratch by "crawling" existing data as well as subsequent updating from pushed events

Apps
====

* Can talk to Connectors or Collections, whatever data they need
* For now, primary interface is just via web browser
* Should contain all resources needed locally
* Do something awesome for the person with their data :)

Service Types
=============

A "service types" system, mimic mime types for collections/connectors, connectors list what they require and produce, apps can list what types they need to work

A connector advertises which type it produces (page/safari-bookmark), and that type has a spec of common attributes expected within the data for the first part (page), the second part should describe the native format from the source of the data (safari-bookmark)

	place/facebook
	place/foursquare
	photo/flickr
	contact/addressbook
	page/safari-bookmark
	page/safari-history
