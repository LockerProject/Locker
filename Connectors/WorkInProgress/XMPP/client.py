#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import time
import logging
import json
import httplib
import sleekxmpp as xmpp

sys.path.append("../../Common/python")
import lockerfs

import util

# sleekxmpp claims this is necessary
if sys.version_info < (3, 0):
    reload(sys)
    sys.setdefaultencoding('utf8')

def stanza_to_dict(stanza):
    data = {}
    for key in stanza.keys():
        value = stanza[key]
        try:
            # if json compatible use the value directly
            json.dumps(value)
            data[key] = value
        except:
            # otherwise coerce to string
            data[key] = str(value)
    return data

class Client(xmpp.ClientXMPP):

    def __init__(self, core_info, jid, password):
        xmpp.ClientXMPP.__init__(self, jid, password)

        self.core_info = core_info
        self.me_info = lockerfs.loadJsonFile("me.json")

        self.auto_reconnect = False

        self.add_event_handler("session_start", self.start)
        self.add_event_handler("message", self.message)
        self.add_event_handler("changed_status", self.status)
        self.add_event_handler("failed_auth", self.fail)
        self.add_event_handler("disconnect", self.fail)

        self.message_file = open("messages.json", "a+")
        self.message_file.seek(0)
        self.messages = [json.loads(msg) for msg in self.message_file.readlines()]
        logging.info("Messages " + str(self.messages))
        
        self.status_file = open("statuses.json", "a+")
        self.status_file.seek(0)
        self.statuses = [json.loads(sts) for sts in self.status_file.readlines()]
        
    def start(self, event):
        self.sendPresence()

    def fetch_roster(self):
        try:
            xmpp.ClientXMPP.get_roster(self)
            logging.info("Roster: %s" % self.roster)
            return self.roster
        except Exception, exc:
            util.die("Couldn't fetch roster: %s" % exc)
            
    def message(self, message):
        message = stanza_to_dict(message)
        message["timestamp"] = time.time()
        self.messages.append(message)
        self.push_event("message/XMPP", message)
        msg_string = json.dumps(message) 
        self.message_file.write(msg_string + "\n")
        logging.info("Message: %s" % msg_string)

    def status(self, status):
        status = stanza_to_dict(status)
        status["timestamp"] = time.time()
        self.statuses.append(status)
        self.push_event("status/XMPP", status)
        sts_string = json.dumps(status)
        self.status_file.write(sts_string + "\n")
        logging.info("Status: %s" % sts_string)

    def fail(self, fail):
        util.die(fail)

    def push_event(self, event_type, event):
        data = json.dumps({
                "id": self.me_info["id"],
                "type": event_type,
                "obj": event
                })
        headers = {"Content-type": "application/json"}
        url = self.core_info["lockerUrl"].rstrip("/").lstrip("http:/")
        conn = httplib.HTTPConnection(url)
        conn.request("POST", "/event", data, headers)
        status = conn.getresponse().status
        if status != 200:
            logging.error("push_event failed with code %s" % status)
        conn.close()

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO,
                        format='%(levelname)-8s %(message)s')

    jid = "locker-test@jabber.org"
    password = "stopbreakingmyshit"
    client = Client(jid, password)

    if client.connect():
        client.process(threaded=False)
    else:
        logging.error("Unable to connect")
