from flask import Flask, render_template, url_for, request, redirect
import lockerfs
import gcontacts
import threading
import time

app = Flask(__name__)

class PullThread(threading.Thread):
    def run(self):
        gdc = gcontacts.GoogleDataContacts()
        while 1:
            gdc.updateAll()
            time.sleep(360.0)

@app.route("/setupAuth")
def setupAuth():
    return render_template("setupAuth.html")

@app.route("/startPulling")
def startPulling():
    if app.consumerValidated:
        if app.puller is None:
            app.puller = PullThread()
            app.puller.start()
            return "Started puller"
        return "Puller already running"
    else:
        return redirect(url_for("setupAuth"))

@app.route("/save")
def saveAuth():
    if not gcontacts.testCredentials(request.args["consumerKey"], request.args["consumerSecret"]):
        return redirect(url_for("setupAuth"))
    me = lockerfs.loadMeData()
    me["consumerKey"] = request.args["consumerKey"]
    me["consumerSecret"] = request.args["consumerSecret"]
    lockerfs.saveMeData(me)
    app.consumerValidated = True
    return redirect(url_for("mainIndex"))

@app.route("/")
def mainIndex():
    if app.consumerValidated:
        return("Authed stuff")
    else:
        return redirect(url_for("setupAuth"))

def runService(port):
    me = lockerfs.loadMeData()
    app.consumerValidated = "consumerKey" in me and "consumerSecret" in me
    app.puller = None
    app.debug = True
    app.run(port=port, use_reloader=False)

