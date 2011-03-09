#!/usr/bin/env python
# encoding: utf-8
"""
Basic google data interface for contacts

12-06-2010 Simon Murtha-Smith 
    * Original creation
3-1-2011 Thomas "temas" Muldowney
    * Moved it into a class for use by the Connector
"""

import atom
import gdata.contacts
import gdata.contacts.service
import json
import hashlib
import sys
import os
import lockerfs
from datetime import datetime
import time

def testCredentials(username, password):
    me = lockerfs.loadMeData()
    gd_client = gdata.contacts.service.ContactsService()
    gd_client.email = username
    gd_client.password = password
    gd_client.source = 'locker-0.1'
    try:
        gd_client.ProgrammaticLogin()
        return True
    except Exception:
        return False


class GoogleDataContacts:
    def __init__(self):
        secrets = lockerfs.loadJsonFile("secrets.json");
        statusData = lockerfs.loadJsonFile("status.json")
        if "lastUpdate" in statusData:
            self.lastUpdate = datetime.fromtimestamp(int(statusData["lastUpdate"]))
        else:
            self.lastUpdate = datetime.fromtimestamp(0)
        self.gd_client = gdata.contacts.service.ContactsService()
        self.gd_client.email = secrets["consumerKey"]
        self.gd_client.password = secrets["consumerSecret"]
        self.gd_client.source = 'locker-0.1'
        m = hashlib.sha1()
        m.update(self.gd_client.email)
        self.uid = m.hexdigest()

    def updateAll(self):
        try:
            os.makedirs("photos")
        except OSError:
            pass
        sys.stdout.write("Checking for udpates since %s" % (str(self.lastUpdate)))
        sys.stdout.flush()
        self.gd_client.ProgrammaticLogin()
        self.write_groups_feed_to_file()
        self.write_feed_to_file()

    def fullSync(self):
        """Performs an update that also checks for deletes."""
        pass

    def write_groups_feed_to_file(self):
        feed = self.gd_client.GetGroupsFeed()
        if len(feed.entry) <= 0:
            return

        jsonFile = open('groups.json', 'w')
        for i, entry in enumerate(feed.entry):
            jsonObject = {}
            indexOfSlash = entry.id.text.rfind("/")
            jsonObject["id"] = entry.id.text[indexOfSlash+1:]
            #jsonObject["id"] = entry.id.text[-16:]
            jsonObject["name"] = entry.title.text
            jsonFile.write(json.dumps(jsonObject) + '\n')

    def write_entry_to_file(self, i, entry):
        jsonObject = {}
        indexOfSlash = entry.id.text.rfind("/")
        jsonObject["id"] = entry.id.text[indexOfSlash+1:]
        print '%s %s' % (i+1, entry.title.text)
        
        if entry.title.text: jsonObject["name"] = entry.title.text
        if entry.nickname: jsonObject["nickname"] = entry.nickname
            
        # Display the primary email address for the contact.
        if entry.email:
            jsonObject["email"] = []
            for email in entry.email:
                jsonEmail = {}
                jsonEmail["value"] = email.address
                label = email.rel or email.label
                indexOfHash = label.find("#")
                label = label[indexOfHash+1:]
                if label != 'other': jsonEmail["type"] = label
                jsonObject["email"].append(jsonEmail)
            
        if entry.phone_number:
            jsonObject["phone"] = []
            for phone in entry.phone_number:
                jsonPhone = {}
                jsonPhone["value"] = phone.text
                label = phone.rel or phone.label
                indexOfHash = label.find("#")
                label = label[indexOfHash+1:]
                if label != 'other': jsonPhone["type"] = label
                jsonObject["phone"].append(jsonPhone)
                
        if entry.postal_address:
            jsonObject["address"] = []
            for postalAddress in entry.postal_address:
                jsonAddress = {}
                jsonAddress["value"] = postalAddress.text
                label = postalAddress.rel or postalAddress.label
                indexOfHash = label.find("#")
                label = label[indexOfHash+1:]
                if label != 'other': jsonAddress["type"] = label
                jsonObject["address"].append(jsonAddress)
                
#        if entry.birthday:
#            print entry.birthday
#        print entry.system_group
        if entry.group_membership_info:
            jsonObject["groups"] = []
            for group in entry.group_membership_info:
                jsonObject["groups"].append(group.href[-16:])
        
        #print json.dumps(jsonObject)
        self.jsonFile.write(json.dumps(jsonObject) + '\n')
        try:
            hosted_image_binary = self.gd_client.GetPhoto(entry)
            #print hosted_image_binary
            if hosted_image_binary:
                image_file = open('photos/{0}.jpg'.format(jsonObject["id"]), 'wb')
                image_file.write(hosted_image_binary)
                image_file.close()
        except gdata.service.RequestError:
            pass
        
    def write_feed_to_file(self):
        self.jsonFile = open('contacts.json', 'w')
        query = gdata.contacts.service.ContactsQuery()
        #query.updated_min = self.lastUpdate.isoformat()
        query.max_results = 3000
        feed = self.gd_client.GetContactsFeed(query.ToUri())
        if len(feed.entry) <= 0:
            return
        for i, entry in enumerate(feed.entry):
            self.write_entry_to_file(i, entry)
        self.jsonFile.close()
        self.lastUpdate = datetime.now()
        lockerfs.saveJsonFile("status.json", {"lastUpdate":time.mktime(self.lastUpdate.timetuple())})

