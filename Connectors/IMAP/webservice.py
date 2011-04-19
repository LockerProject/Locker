#
# Copyright (C) 2011, The Locker Project
# All rights reserved.
#
# Please see the LICENSE file for more information.
#

#webservice for IMAP
from flask import Flask, render_template, url_for, request, redirect, send_file
import lockerfs
import time
import datetime
import urllib2
import thread
import json
#import sys
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
        return "true"
    else:
        return "<html>looks like you still need to <a href='setupAuth'>auth your account</a></html>"
#        return redirect("http://localhost:18043/setupAuth")


@app.route("/save", methods=['POST'])
def saveAuth():    
    secrets = lockerfs.loadJsonFile("secrets.json");
    secrets["username"] = request.form["username"]
    secrets["password"] = request.form["password"]
    secrets["server"] = request.form["server"]
    app.consumerValidated = True
    lockerfs.saveJsonFile("secrets.json", secrets)
    return "<html>Looks good! You can:<br><ul><li><a href='update'>Get new messages</a></li></ul>"
#    return redirect(url_for("mainIndex"))

@app.route("/")
def mainIndex():
    if app.consumerValidated:
        return "<html>Looks good! You can:<br><ul><li><a href='update'>Get new messages</a></li></ul>"
        #return render_template("index.html", updateTime=app.updateAt, updatesStarted=app.updatesStarted)
    else:
        return "<html>looks like you still need to <a href='setupAuth'>auth your account</a></html>"
#        return redirect(url_for("/setupAuth"))


@app.route("/allMessages")
def allMessages():
    box = request.args.get('box', '')
    start = int(request.args['start'])
    end = int(request.args['end'])
    attachmentTypes = request.args.get('attachmentTypes')
    if attachmentTypes is not None:
        try:
#            attachmentTypes = json.loads(attachmentTypes)
            attachmentTypes = attachmentTypes.split(',')
        except:
            pass
    hasAttachment = request.args.get('hasAttachment')
    if hasAttachment is not None or attachmentTypes is not None:
        hasAttachment = str(hasAttachment).lower()
        hasAttachment = (hasAttachment == 'true' or hasAttachment == '1' or attachmentTypes is not None)
    secrets = lockerfs.loadJsonFile("secrets.json");
    username = secrets['username']
    boxPath = username + '/' + box
    messages = []
    
    for i in range(start, end):
        message = lockerfs.loadJsonFile(boxPath + '/' + str(i))
        if filter(message, hasAttachment, attachmentTypes):
            messages.append(message)
    
    return json.dumps(messages)


def filter(message, hasAttachment, attachmentTypes):
    if len(message.keys()) > 0:
        if hasAttachment:
            if len(message['attachments']) > 0:
                if len(attachmentTypes) > 0:
                    for attachment in message['attachments']:
                        for attachmentType in attachmentTypes:
                            if attachment["type"] == attachmentType:
                                return True
                else:
                    return True
            else:
                return False
        elif hasAttachment is not None:
            return (len(message['attachments']) == 0)
        else:
            return True
    return False

def runService(info):
    secrets = lockerfs.loadJsonFile("secrets.json");
    app.lockerInfo = info
    app.consumerValidated = "username" in secrets and "password" in secrets and "server" in secrets 
    app.debug = False
    app.run(port=app.lockerInfo["port"], use_reloader=False)

