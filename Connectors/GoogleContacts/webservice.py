from flask import Flask, render_template, url_for, request, redirect, send_file
import lockerfs
import gcontacts
import time
import datetime
import urllib2

app = Flask(__name__)

@app.route("/allContacts")
def allContacts():
    return send_file("{0}/contacts.json".format(app.lockerInfo["workingDirectory"]))

@app.route("/setupAuth")
def setupAuth():
    return render_template("setupAuth.html")

@app.route("/update")
def update():
    if app.consumerValidated:
        if datetime.datetime.now() < app.updateAt:
            return "Update alrady scheduled"
        app.updatesStarted = True
        gdc = gcontacts.GoogleDataContacts()
        gdc.updateAll()
        at = time.mktime(datetime.datetime.now().timetuple()) + 720 # Just doing 10m updates for nwo
        app.updateAt = datetime.datetime.fromtimestamp(at)
        me = lockerfs.loadMeData()
        url = "{0}at?at={1}&id={2}&cb=/update".format(app.lockerInfo["lockerUrl"], at, me["id"])
        urllib2.urlopen(url)
        return "Updated"
    else:
        return redirect(url_for("setupAuth"))

@app.route("/save")
def saveAuth():
    if not gcontacts.testCredentials(request.args["consumerKey"], request.args["consumerSecret"]):
        return redirect(url_for("setupAuth"))
    secrets = lockerfs.loadJsonFile("secrets.json");
    secrets["consumerKey"] = request.args["consumerKey"]
    secrets["consumerSecret"] = request.args["consumerSecret"]
    lockerfs.saveJsonFile("secrets.json", secrets)
    app.consumerValidated = True
    return redirect(url_for("mainIndex"))

@app.route("/")
def mainIndex():
    if app.consumerValidated:
        return render_template("index.html", updateTime=app.updateAt, updatesStarted=app.updatesStarted)
    else:
        return redirect(url_for("setupAuth"))

def runService(info):
    secrets = lockerfs.loadJsonFile("secrets.json");
    app.lockerInfo = info
    app.consumerValidated = "consumerKey" in secrets and "consumerSecret" in secrets 
    app.puller = None
    app.updateAt = datetime.datetime.now()
    app.updatesStarted = False
    app.debug = True
    app.run(port=app.lockerInfo["port"], use_reloader=False)

