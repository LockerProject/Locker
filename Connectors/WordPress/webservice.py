import sys
import json
import logging
from flask import Flask, render_template, request, redirect, url_for

sys.path.append("../../Common/python")
import lockerfs

import client
import util
import xmlrpclib
import os

app = Flask(__name__)

@app.route("/setupAuth")
def setupAuth():
    return render_template("setupAuth.html")

@app.route("/save", methods=['POST'])
def saveAuth():
    logging.info("Saving auth")
    secrets = lockerfs.loadJsonFile("secrets.json")
    secrets["url"] = request.form["url"]
    secrets["user"] = request.form["user"]
    secrets["password"] = request.form["password"]
    secrets["server_type"] = "wordpress" # !!! other types are awaiting testing
    start(secrets)
    lockerfs.saveJsonFile("secrets.json", secrets)
    return json.dumps("started")

def start(secrets):
    logging.info("Starting")
    app.client = client.Client(app.info, url=secrets["url"], user=secrets["user"], password=secrets["password"], server_type=secrets["server_type"])
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
        return json.dumps({
                "/info" : "User info",
                "/blogs" : "List of users blogs",
                "/posts" : "List of users posts",
                "/comments" : "Comments on users posts",
                "/pingbacks" : "Pingbacks to users blogs",
                "/trackbacks" : "Trackbacks to users blogs",
                "/update" : "update to refresh info"
                })
    else:
        return redirect(lockerfs.loadMeData()["uri"] + "setupAuth")

def matches_arg(value, arg):
    # either a literal match or a range [lo,hi]
    if type(arg) is list and len(arg) is 2:
        (lo, hi) = arg
        return (lo <= value) and (value < hi)
    else:
        return (value == arg)

@app.route("/info")
def info():
    return json.dumps(app.client.user_info)

@app.route("/blogs")
def blogs():
    blogs = app.client.blogs
    for key, value in request.args.items():
        blogs = [blog for blog in blogs if matches_arg(blog[key], json.loads(value))]
    return json.dumps(blogs)

@app.route("/posts")
def posts():
    posts = app.client.posts
    for key, value in request.args.items():
        posts = [post for post in posts if matches_arg(post[key], json.loads(value))]
    return json.dumps(posts)

@app.route("/comments")
def comments():
    comments = app.client.comments
    for key, value in request.args.items():
        comments = [comment for comment in comments if matches_arg(comment[key], json.loads(value))]
    return json.dumps(comments)

@app.route("/pingbacks")
def pingbacks():
    pingbacks = app.client.pingbacks
    for key, value in request.args.items():
        pingbacks = [pingback for pingback in pingbacks if matches_arg(pingback[key], json.loads(value))]
    return json.dumps(pingbacks)

@app.route("/trackbacks")
def trackbacks():
    trackbacks = app.client.trackbacks
    for key, value in request.args.items():
        trackbacks = [trackback for trackback in trackbacks if matches_arg(trackback[key], json.loads(value))]
    return json.dumps(trackbacks)

@app.route("/uploadFile")
def uploadFile():
    f = request.args["file"]
    data = {}
    data["name"] = os.path.basename(f)
    data["type"] = "image/jpeg"
    data["bits"] = xmlrpclib.Binary(open(f).read())
    data["overwrite"] = 1
    app.client._server.wp.uploadFile('', app.client.user, app.client.password, data)
    return "kthxbye"

def runService(info):
    app.info = info
    app.client = None
    app.started = False

    secrets = lockerfs.loadJsonFile("secrets.json")
    if "url" in secrets and "user" in secrets and "password" in secrets:
        start(secrets)
    else:
        logging.info("No auth details available")
    app.debug = True
    app.run(port=app.info["port"], use_reloader=False)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,
                        format='%(levelname)-8s %(message)s')

    runService({"port": 7474})
