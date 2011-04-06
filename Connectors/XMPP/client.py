#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import time
import logging
import sleekxmpp as xmpp
import json

# sleekxmpp claims this is necessary
if sys.version_info < (3, 0):
    reload(sys)
    sys.setdefaultencoding('utf8')

jid = "locker-test@jabber.org"
password = "stopbreakingmyshit"

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

    def __init__(self, jid=jid, password=password):
        xmpp.ClientXMPP.__init__(self, jid, password)

        self.add_event_handler("session_start", self.start)
        self.add_event_handler("message", self.message)
        self.add_event_handler("changed_status", self.status)
        self.add_event_handler("failed_auth", self.fail)

        self.message_file = open("messages.json", "a+")
        self.messages = [json.loads(msg) for msg in self.message_file.readlines()]
        
        self.status_file = open("statuses.json", "a+")
        self.statuses = [json.loads(sts) for sts in self.status_file.readlines()]
        
    def start(self, event):
        self.sendPresence()

    def getRoster(self):
        try:
            xmpp.ClientXMPP.getRoster(self)
            logging.info("Roster: %s" % self.roster)
        except exc:
            logging.info("Roster fail: %s" % exc)
            
    def message(self, message):
        message = stanza_to_dict(message)
        message["timestamp"] = time.time()
        self.messages.append(message)
        msg_string = json.dumps(message) 
        self.message_file.write(msg_string + "\n")
        logging.info("Message: %s" % msg_string)

    def status(self, status):
        status = stanza_to_dict(status)
        status["timestamp"] = time.time()
        self.statuses.append(status)
        sts_string = json.dumps(status)
        self.status_file.write(sts_string + "\n")
        logging.info("Status: %s" % sts_string)

    def fail(self, fail):
        logging.error("Fail: %s" % fail)
        exit(1)

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO,
                        format='%(levelname)-8s %(message)s')

    client = Client(jid, password)

    if client.connect():
        client.process(threaded=False)
    else:
        logging.error("Unable to connect")
