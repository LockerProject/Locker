import sys
sys.path.append("../../Common/python")
from flask import Flask, render_template, request, redirect, url_for
import lockerfs
import logging
import client
import json

app = Flask(__name__)
app.client = None
app.started = False

@app.route("/setupAuth")
def setupAuth():
    return render_template("setupAuth.html")

@app.route("/save", methods=['POST'])
def saveAuth():
    logging.info("Saving auth")
    secrets = lockerfs.loadJsonFile("secrets.json")
    secrets["jid"] = request.form["jid"]
    secrets["password"] = request.form["password"]
    lockerfs.saveJsonFile("secrets.json", secrets)
    return start()

def start():
    secrets = lockerfs.loadJsonFile("secrets.json")
    app.client = client.Client(jid=secrets["jid"], password=secrets["password"])
    if app.client.connect():
        app.client.process(threaded=True)
        app.started = True
        return json.dumps("Started")
    else:
        logging.error("Connection failed")
        exit(1)

@app.route("/")
def index():
    if app.started:
        return json.dumps({
                "/messages" : "All messages received. Filter by: body, from, mucnick, mucroom, to, type, id, subject",
                "/statuses" : "All status updates received. Filter by: status, from, show, priority, type, id",
                "/roster" : "Current roster (at time of login)"
                })
    else:
        return redirect(url_for("setupAuth"))

def matches_arg(value, arg):
    # either a literal match or a range [lo,hi]
    if type(arg) is list and len(arg) is 2:
        (lo, hi) = arg
        return (lo <= value) and (value < hi)
    else:
        return (value == arg)

@app.route("/messages")
def messages():
    messages = app.client.messages
    for key, value in request.args.items():
        messages = [msg for msg in messages if matches_arg(msg[key], json.loads(value))]
    return json.dumps(messages)

@app.route("/statuses")
def statuses():
    statuses = app.client.statuses
    for key, value in request.args.items():
        statuses = [sts for sts in statuses if matches_arg(sts[key], json.loads(value))]
    return json.dumps(statuses)

@app.route("/roster")
def roster():
    app.client.getRoster()
    return json.dumps(app.client.roster)

def runService(info):
    app.info = info
    secrets = lockerfs.loadJsonFile("secrets.json")
    if "jid" in secrets and "password" in secrets:
        logging.info("Starting")
        start()
    else:
        logging.info("No auth details available")
    app.debug = True
    app.run(port=app.info["port"], use_reloader=False)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,
                        format='%(levelname)-8s %(message)s')

    runService({"port": 7474})
