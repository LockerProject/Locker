#
# Copyright (C) 2011, The Locker Project
# All rights reserved.
#
# Please see the LICENSE file for more information.
#

from flask import Flask, render_template, url_for, request, redirect, send_file
import lockerfs
import gcontacts
import time
import datetime
import urllib
import urllib2
import sys
import os

app = Flask(__name__)

@app.route("/getCurrent/contacts")
def allContacts():
    if os.path.exists(app.lockerInfo["workingDirectory"] + "/current.json"):
        fd = open("current.json", "r")
        lines = fd.readlines()
        fd.close()
        return "[{0}]".format(",".join(lines))
    else:
        return "[]"

@app.route("/setupAuth")
def setupAuth():
    sys.stderr.write("Sending setupAuth template")
    return render_template("setupAuth.html")

@app.route("/update")
def update():
    if app.consumerValidated:
        if datetime.datetime.now() < app.updateAt:
            return "Update already scheduled"
        app.updatesStarted = True
        gdc = gcontacts.GoogleDataContacts()
        updateCount = gdc.updateAll()
        me = lockerfs.loadMeData()
        lockerBase = app.lockerInfo["lockerUrl"] + '/core/' + me["id"]
        
        # Tell the diary how many contacts we updated
        url = "{0}/diary?{1}".format(lockerBase, urllib.urlencode([("message", "Updated {0} contacts in Google Contacts".format(updateCount))]))
        urllib2.urlopen(url)

        # Schedule a new update
        at = time.mktime(datetime.datetime.now().timetuple()) + 720 # Just doing 10m updates for nwo
        app.updateAt = datetime.datetime.fromtimestamp(at)
        url = "{0}/at?at={1}&cb=/update".format(lockerBase, at)
        urllib2.urlopen(url)
        return "Updated"
    else:
        return redirect(app.meInfo["uri"] + "setupAuth")

@app.route("/save")
def saveAuth():
    if not gcontacts.testCredentials(request.args["consumerKey"], request.args["consumerSecret"]):
        return redirect(app.meInfo["uri"] + "setupAuth")
    secrets = lockerfs.loadJsonFile("secrets.json");
    secrets["consumerKey"] = request.args["consumerKey"]
    secrets["consumerSecret"] = request.args["consumerSecret"]
    lockerfs.saveJsonFile("secrets.json", secrets)
    app.consumerValidated = True
    return redirect(app.meInfo["uri"] + "/")

@app.route("/")
def mainIndex():
    if app.consumerValidated:
        sys.stderr.write("Rendering index")
        return render_template("index.html", updateTime=app.updateAt, updatesStarted=app.updatesStarted)
    else:
        sys.stderr.write("Going to auth")
        return redirect(app.meInfo["uri"] + "setupAuth")

def runService(info):
    secrets = lockerfs.loadJsonFile("secrets.json");
    app.lockerInfo = info
    app.consumerValidated = "consumerKey" in secrets and "consumerSecret" in secrets 
    app.puller = None
    app.updateAt = datetime.datetime.now()
    app.updatesStarted = False
    app.meInfo = lockerfs.loadMeData()
    app.debug = True
    app.run(port=app.lockerInfo["port"], use_reloader=False)

