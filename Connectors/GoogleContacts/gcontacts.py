#
# Copyright (C) 2011, The Locker Project
# All rights reserved.
#
# Please see the LICENSE file for more information.
#

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
# import hashlib
import sys
import os
import lockerfs
from datetime import datetime
from datetime import tzinfo
import time
import threading

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


class gPhotoThread(threading.Thread):
    """Will download a photo."""
    def __init__(self, gd_client, entries):
        super(gPhotoThread, self).__init__()
        self.gd_client = gd_client
        self.entries = entries
    
    def run(self):    
        for i, entry in enumerate(self.entries):
            try:
                indexOfSlash = entry.id.text.rfind("/")
                id = entry.id.text[indexOfSlash+1:]
                hosted_image_binary = self.gd_client.GetPhoto(entry)
                #print hosted_image_binary
                if hosted_image_binary:
                    image_file = open('photos/{0}.jpg'.format(id), 'wb')
                    image_file.write(hosted_image_binary)
                    image_file.close()
            except gdata.service.RequestError:
                pass
                    
                    
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
        # m = hashlib.sha1()
        # m.update(self.gd_client.email)
        # self.uid = m.hexdigest()

    def updateAll(self):
        try:
            os.makedirs("photos")
        except OSError:
            pass
        sys.stdout.write("Checking for updates since %s" % (str(self.lastUpdate.isoformat())))
        sys.stdout.flush()
        self.gd_client.ProgrammaticLogin()
        self.write_groups_feed_to_file()
        return self.write_feed_to_file()

    def write_groups_feed_to_file(self):
        feed = self.gd_client.GetGroupsFeed()
        if len(feed.entry) <= 0:
            return

        jsonFile = open('groups.json', 'w')
        for i, entry in enumerate(feed.entry):
            jsonObject = {}
            indexOfSlash = entry.id.text.rfind("/")
            jsonObject["id"] = entry.id.text[indexOfSlash+1:]
            jsonObject["name"] = entry.title.text
            jsonFile.write(json.dumps(jsonObject) + '\n')


    def write_feed_to_file(self):
        
        # get all contacts and write overwrite the current.json file
        current = open('current.json', 'w')
        allQuery = gdata.contacts.service.ContactsQuery()
        allQuery.max_results = 3000
        self.write_query_to_file(allQuery, current, False, False)
        current.close()
        
        # get only updates since the last time and append to the all.json file
        allFile = open('all.json', 'a')
        updatesQuery = gdata.contacts.service.ContactsQuery()
        updatesQuery['updated-min'] = self.lastUpdate.isoformat()
        updatesQuery['showdeleted'] = 'true'
        updatesQuery['sortorder'] = 'ascending'
        updatesQuery.orderby = 'lastmodified'
        updatesQuery.max_results = 3000
        self.lastUpdate = datetime.utcnow()
        numUpdated = self.write_query_to_file(updatesQuery, allFile, False, True)
        allFile.close()
        
        lockerfs.saveJsonFile("status.json", {"lastUpdate":time.mktime(self.lastUpdate.timetuple())})
        return numUpdated

    def write_query_to_file(self, query, a_file, dlPhotos, isHistorical):
        query.max_results = 3000
        feed = self.gd_client.GetContactsFeed(query.ToUri())
        if len(feed.entry) <= 0:
            return
        if dlPhotos is True:
            photoThread = gPhotoThread(self.gd_client, feed.entry)
            photoThread.start()
        for i, entry in enumerate(feed.entry):
            self.write_entry_to_file(a_file, i, entry, isHistorical)
        # sys.stderr.write("updated %s" % (feed.updated))
        # sys.stderr.flush()
        
        return len(feed.entry)

    def write_entry_to_file(self, a_file, i, entry, isHistorical):
        rawJSONObject = self.convert_to_json(entry)

        jsonObject = {};
        if isHistorical == True:
            jsonObject['data'] = rawJSONObject
            jsonObject['timeStamp'] = time.mktime(datetime.utcnow().timetuple())
            # sys.stderr.write("obj %s" % (entry.updated))
            # sys.stderr.flush()
        else :
            jsonObject = rawJSONObject

        a_file.write(json.dumps(jsonObject) + '\n')
        
    def convert_to_json(self, entry):
        jsonObject = {}
        indexOfSlash = entry.id.text.rfind("/")
        jsonObject["id"] = entry.id.text[indexOfSlash+1:]

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

        if entry.gender:
            print dir(entry.gender)
            # jsonObject["address"] = entry.gender

#        if entry.birthday:
#            print entry.birthday
#        print entry.system_group
        if entry.group_membership_info:
            jsonObject["groups"] = []
            for group in entry.group_membership_info:
                jsonObject["groups"].append(group.href[-16:])

        return jsonObject

