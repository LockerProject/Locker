Locker - the "me" platform
======================

This is an open source project that helps me collect all of my personal data, from wherever it is, into one place, and then lets me do really awesome stuff with it.

STATUS: eager-developer-friendly only at this point, we're working hard to make it usable for early adopters very soon, keep an eye on [@lockerproject](http://twitter.com/lockerproject) and [@jeremie](http://twitter.com/jeremie) for progress, and come hang out with us on freenode IRC in [#lockerproject](http://webchat.freenode.net/?channels=lockerproject).


## Getting Started

### The Fast Way

Lockerbox (by [pib](https://www.github.com/pib)) is a straightforward way to get all the high-level dependencies installed at once. It will make a single directory called lockerbox and get everything set up inside of there.

    curl https://raw.github.com/smurthas/lockerbox/master/lockerbox.sh > lockerbox.sh
    chmod 0755 lockerbox.sh
    ./lockerbox.sh

When that successfully completes, add lockerbox/local/bin to your path:

    echo 'export PATH=$PATH:'`pwd`/lockerbox/local/bin >> ~/.profile
    source ~/.profile

Then:
    
    cd lockerbox/Locker
    #check to make sure everything worked
    ./checkEnv.sh
    node lockerd.js

now open [http://localhost:8042/](http://localhost:8042/) in your browser!


### The _"Real"_ Way

To get started I'll need [node (v0.4.6 - v0.4.8)](http://nodejs.org/dist/node-v0.4.8.tar.gz), [npm (v1.0+)](https://github.com/isaacs/npm), and [MongoDB (v1.4+) ](http://mongodb.org) installed, and then a local copy of the Locker codebase:

    git clone https://github.com/LockerProject/Locker.git
    cd Locker

Then I can install dependencies (this may take a little while):

    npm install

There are a few Python utilities that are used in the stack, so I'll run (this requires [setuptools](http://pypi.python.org/pypi/setuptools)):

    python setupEnv.py
    
The I'll run the checkEnv.sh script to ensure I have everything install correctly:

    ./checkEnv.sh

To turn on my locker I run:

    node lockerd.js

Then I go to to the dashboard:

    http://localhost:8042/

To get started using the system, navigate to the 'Services' menu item, select an account to connect, and follow the instructions to start using that connector with your locker.


If you have any problems, come ask us in [IRC](http://webchat.freenode.net/?channels=lockerproject), take a look at the [troubleshooting page](https://github.com/LockerProject/Locker/wiki/Troubleshooting-faq). If you solve any problems for yourself, please add your learnings!


## Detailed Installation Steps

If you haven't used node or mongo before, it's worth getting everything in place before cloning the repo:

### Node

It's easiest to just download the [tarball](http://nodejs.org/dist/node-v0.4.8.tar.gz). If you choose to build it from the github repo, you will need to checkout a tagged version v0.4.6 - v0.4.8.

Once it's downloaded:

    #from the extracted directory
    ./configure
    #make will take a few minutes
    make
    make install

This will build node from source and install it, adding it to your PATH. To ensure that it worked:

    node -v
    v0.4.8

You will need gcc and libssl-dev, but those should already be present on most systems. On linux systems, apt-get installation has caused problems for some folks (it can leave out node-waf, which causes issues installing modules later), so building from the tarball is the recommended method.


### NPM

npm has very thorough installation instructions at [https://github.com/isaacs/npm#readme](https://github.com/isaacs/npm#readme). Note, node must be installed BEFORE npm.


### MongoDB

Mongo has comprehensive installation instructions at [http://www.mongodb.org/display/DOCS/Quickstart](http://www.mongodb.org/display/DOCS/Quickstart)

Once you have it installed, ensure that it is in your PATH:

    mongod --version
    db version v1.8.1, pdfile version 4.5
    
The version number just needs to be 1.4 or greater (however, we only test with 1.8+, so if you are on an old version, you might consider updating)

If not, you can add the following line to your ~/.profile file:

    export PATH=$PATH:/path/to/mongo/bin


### setuptools

Many systems will already have setuptools installed, but if your doesn't, it can be found (along with installation instructions) [here](http://pypi.python.org/pypi/setuptools)


### Locker

If (you think) you've got everything all set:

    git clone https://github.com/LockerProject/Locker.git
    cd Locker
    ./checkEnv.sh

you should see something like:

    Python version 2.7 found.
    Node.js version 0.4.8 found.
    npm version 1.0.14 found.
    mongoDB version 1.8.2 found.

Your version numbers may vary slightly, but so long as you don't see any red text, you are all set. (At this point, the vows check has been disabled.) If vows gives an error:

    sudo npm install -g vows

Then you can install all of Locker's node dependencies:

    #from the Locker root directory
    npm install

At this point you should be all set (famous last words). Next, run the tests:

    cd tests
    node runTest.js

On a good day, all these tests will pass, resulting in something like:

    ✓ OK » 222 honored (56.306s)

If, only a few fail, but it gets through the whole run, then chances are someone just broke something with a late night commit the previous evening. :).


## What are these things? ##

* **Connectors** - A service that knows how to connect to and sync data with a place where I have data about myself, such as an account on a site or service, or in some desktop app, on my phone, or even from a device.
* **Collections** - My data from the many different sources gets organized into common collections, such as places, contacts, messages, statuses, links, etc.
* **Apps** - Once my data is in my locker I need apps that do useful or fun things for me, with the ability to control where my data goes and not have to give up access to my online accounts.

Once I "install" them in my locker (giving them some working space, a local port, and some config), I can browse to them where they provide their own instructions/steps (for now, it's early yet and pretty manual).  To learn a bit more about the innards, I can install and run the Dev Docs app. :)

We need *TONS* of help and it's welcomed across the board, particularly in adding and advancing more of the connectors, just don a hard-hat and dig in, all patches welcomed, personal data FTW!

**I am the platform.**
