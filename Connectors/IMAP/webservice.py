#webservice for IMAP
from flask import Flask, render_template, url_for, request, redirect, send_file
import lockerfs
import time
import datetime
import urllib2
import thread
import json
from limap import MailboxProcessor

app = Flask(__name__)

@app.route("/setupAuth")
def setupAuth():
    return render_template("setupAuth.html")

@app.route("/update")
def update():
    if app.consumerValidated:
        secrets = lockerfs.loadJsonFile("secrets.json");
        proc = MailboxProcessor(secrets["server"], secrets["username"], secrets["password"])
        thread.start_new_thread(proc.process,())
        return "Yep!"
    else:
        return redirect(url_for("setupAuth"))

@app.route("/save", methods=['POST'])
def saveAuth():
    print "saving!!!"
    secrets = lockerfs.loadJsonFile("secrets.json");
    secrets["username"] = request.form["username"]
    secrets["password"] = request.form["password"]
    secrets["server"] = request.form["server"]
    app.consumerValidated = True
    lockerfs.saveJsonFile("secrets.json", secrets)
    return redirect(url_for("mainIndex"))

@app.route("/")
def mainIndex():
    if app.consumerValidated:
        return "hello!!"
        #return render_template("index.html", updateTime=app.updateAt, updatesStarted=app.updatesStarted)
    else:
        return "redirect!"
#        return redirect(url_for("setupAuth"))


@app.route("/allMessages")
def allMessages():
    box = request.args['box']
    start = int(request.args['start'])
    end = int(request.args['end'])
    secrets = lockerfs.loadJsonFile("secrets.json");
    username = secrets['username']
    boxPath = username + '/' + box
    messages = []
    for i in range(start, end):
        message = lockerfs.loadJsonFile(boxPath + '/' + str(i))
        if len(message.keys()) > 0:
            messages.append(message)
    
    return json.dumps(messages)


def runService(info):
    secrets = lockerfs.loadJsonFile("secrets.json");
    app.lockerInfo = info
    app.consumerValidated = "username" in secrets and "password" in secrets and "server" in secrets 
    app.debug = True
    app.run(port=app.lockerInfo["port"], use_reloader=False)

