Locker - the "me" platform
======================

This is an open source project that helps me collect all of my personal data, from wherever it is, into one place, and then lets me do really awesome stuff with it.

STATUS: eager-developer-friendly only at this point, we're working hard to make it usable for early adopters very soon, keep an eye on [@lockerproject](http://twitter.com/lockerproject) and [@jeremie](http://twitter.com/jeremie) for progress! 

To get started I'll need [node](http://nodejs.org/#download) and [npm](https://github.com/isaacs/npm) installed, and then I also need a local copy of the Locker codebase:

    git clone https://github.com/quartzjer/Locker.git
	cd Locker

This is the stable master branch by default, which should work smoothly on OSX/Ubuntu but is kinda minimal. If I want to try a lot more stuff that is on the bleeding edge I can also optionally checkout the dev branch:

    git co dev

Then I can install dependencies (this may take a little while):

    npm install

There are a few Python utilities that are used in the stack, so I'll run (this requires [setuptools](http://pypi.python.org/pypi/setuptools)):

    python setupEnv.py

To turn on my locker I run:

    node locker.js

Then I go to to the dashboard (and am amazed by the design!):

    http://localhost:8042/


## What are these things? ##

* **Connectors** - A service that knows how to connect to and sync data with a place where I have data about myself, such as an account on a site or service, or in some desktop app, on my phone, or even from a device.
* **Collections** - My data from the many different sources gets organized into common collections, such as places, contacts, messages, statuses, links, etc.
* **Apps** - Once my data is in my locker I need apps that do useful or fun things for me, with the ability to control where my data goes and not have to give up access to my online accounts.

Once I "install" them in my locker (giving them some working space, a local port, and some config), I can browse to them where they provide their own instructions/steps (for now, it's early yet and pretty manual).  To learn a bit more about the innards, I can install and run the Dev Docs app. :)

We need *TONS* of help and it's welcomed across the board, particularly in adding and advancing more of the connectors, just don a hard-hat and dig in, all patches welcomed, personal data FTW!

I am the platform.
