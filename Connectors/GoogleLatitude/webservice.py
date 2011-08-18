import sys
import json
import logging
import httplib2
from flask import Flask, flash, render_template, render_template_string, request, redirect, url_for

import oauth2client.client
import oauth2client.file
import oauth2client.tools

sys.path.append("../../Common/python")
import lockerfs

import client
import os

app = Flask(__name__)

@app.route("/setupAuth")
def setupAuth():
    return render_template("setupAuth.html", externalUri=app.info["externalBase"])

@app.route("/saveAuth", methods=['POST'])
def saveAuth():
    logging.info("Saving auth")
    app.secrets["client_id"] = request.form["client_id"]
    app.secrets["client_secret"] = request.form["client_secret"]
    lockerfs.saveJsonFile("secrets.json", app.secrets)
    return get_credentials()

@app.route("/auth")
def handleAuth():
    if "error" in request.args:
        msg = "Failed to get authorization: %s" % request.args["error"]
        logging.error(msg)
        flash(msg, category="error")
        return redirect(app.info["externalBase"] + url_for("setupAuth"))

    try:
        app.credentials = app.flow.step2_exchange(request.args["code"])
    except oauth2client.client.FlowExchangeError as e:
        # NOTE: the client secret is not sent until step 2. so if the user
        # entered an incorrect secret, it would not be detected until trying to
        # obtain the token here.
        msg = "Failed to exchange code for token: %s" % (e,)
        logging.error(msg)
        flash(msg, category="error")
        return redirect(app.info["externalBase"] + url_for("setupAuth"))
    app.cred_storage.put(app.credentials)
    app.credentials.set_store(app.cred_storage.put)
    start(app.credentials)
    return redirect(app.info["externalBase"] + url_for("index"))

def get_credentials():
    if app.credentials is None or app.credentials.invalid:
        app.flow = oauth2client.client.OAuth2WebServerFlow(
                client_id=app.secrets["client_id"],
                client_secret=app.secrets["client_secret"],
                user_agent='locker-connector-latitude/0.1',
                scope='https://www.googleapis.com/auth/latitude.all.best',
                )
        authorize_url = app.flow.step1_get_authorize_url(
                app.info["externalBase"] + url_for('handleAuth'))
        # google (and possibly others?) doesn't allow the authorization page to
        # be loaded inside a frame. since the connector's UI might be inside a
        # frame (the current Locker implementation) we can't do a straight
        # redirect to authorize_url.
        return render_template_string(
                "<a target=_new href='{{ url }}'>Authenticate</a>",
                url=authorize_url
                )
    else:
        start(app.credentials)
        return redirect(app.info["externalBase"] + url_for("index"))

def start(credentials):
    logging.info("Starting")
    app.client = client.Client(
            app.info,
            credentials=credentials,
            )
    app.started = True

@app.route("/update")
def update():
    if app.client:
        app.client.update()
        return json.dumps("updated")
    else:
        return json.dumps("no login")

@app.route("/")
def index():
    if app.started:
        return "<html><a href='locations'>my recorded locations</a>, <a href='update'>refresh info</a></html>"
    else:
        if "client_id" in app.secrets and "client_secret" in app.secrets:
            return get_credentials()
        else:
            return redirect(app.info["externalBase"] + url_for("setupAuth"))

def matches_arg(value, arg):
    # either a literal match or a range [lo,hi]
    if type(arg) is list and len(arg) is 2:
        (lo, hi) = arg
        return (lo <= value) and (value < hi)
    else:
        return (value == arg)

@app.route("/locations")
def locations():
    locations = app.client.locations
    for key, value in request.args.items():
        locations = [location for location in locations.values() if matches_arg(location[key], json.loads(value))]
    return json.dumps(locations)

def runService(info):
    app.info = info
    app.client = None
    app.started = False

    app.secrets = lockerfs.loadJsonFile("secrets.json")
    app.cred_storage = oauth2client.file.Storage('latitude.dat')
    app.credentials = app.cred_storage.get()
    if app.credentials and not app.credentials.invalid:
        start(app.credentials)
    else:
        logging.info("No credentials available")
    app.debug = True
    app.run(port=app.info["port"], use_reloader=False)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,
                        format='%(levelname)-8s %(message)s')

    runService({"port": 7474})
