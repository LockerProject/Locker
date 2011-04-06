#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import logging
import sleekxmpp as xmpp
import json

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
            # if not coerce to string
            data[key] = str(value)
    return data

class Client(xmpp.ClientXMPP):

    def __init__(self, jid=jid, password=password):
        xmpp.ClientXMPP.__init__(self, jid, password)
        self.add_event_handler("session_start", self.start)
        self.add_event_handler("message", self.message)
        self.add_event_handler("changed_status", self.status)

    def start(self, event):
        self.getRoster()
        self.sendPresence()

    def message(self, msg):
        print "Message", json.dumps(stanza_to_dict(msg))

    def status(self, status):
        print "Status", json.dumps(stanza_to_dict(status))

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO,
                        format='%(levelname)-8s %(message)s')

    client = Client(jid, password)

    if client.connect():
        client.process(threaded=False)
        print("Done")
    else:
        print("Unable to connect.")
