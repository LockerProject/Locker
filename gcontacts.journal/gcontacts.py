#!/usr/bin/env python
# encoding: utf-8

"""
test.py

Created by Simon Murtha-Smith on 2010-12-06.
"""

import atom
import gdata.contacts
import gdata.contacts.service
import json
import hashlib
import sys
import os

def write_feed_to_file(gd_client):
    jsonFile = open('my/{0}.contacts.json'.format(GetUIDHash(gd_client)), 'w')
    query = gdata.contacts.service.ContactsQuery()
    query.max_results = 3000
    feed = gd_client.GetContactsFeed(query.ToUri())
    for i, entry in enumerate(feed.entry):
        jsonObject = {}
        indexOfSlash = entry.id.text.rfind("/")
        jsonObject["id"] = entry.id.text[indexOfSlash+1:]
        print '%s %s' % (i+1, entry.title.text)
        
        jsonObject["name"] = entry.title.text
        if entry.nickname:
            jsonObject["nickname"] = entry.nickname
            
        # Display the primary email address for the contact.
        if entry.email:
            jsonObject["email"] = []
            for email in entry.email:
                jsonEmail = {}
                jsonEmail["value"] = email.address
                label = email.rel or email.label
                indexOfHash = label.find("#")
                label = label[indexOfHash+1:]
                if label != 'other':
                    jsonEmail["type"] = label
                jsonObject["email"].append(jsonEmail)
            
        if entry.phone_number:
            jsonObject["phone"] = []
            for phone in entry.phone_number:
                jsonPhone = {}
                jsonPhone["value"] = phone.text
                label = phone.rel or phone.label
                indexOfHash = label.find("#")
                label = label[indexOfHash+1:]
                if label != 'other':
                    jsonPhone["type"] = label
                jsonObject["phone"].append(jsonPhone)
                
        if entry.postal_address:
            jsonObject["address"] = []
            for postalAddress in entry.postal_address:
                jsonAddress = {}
                jsonAddress["value"] = postalAddress.text
                label = postalAddress.rel or postalAddress.label
                indexOfHash = label.find("#")
                label = label[indexOfHash+1:]
                if label != 'other':
                    jsonAddress["type"] = label
                jsonObject["address"].append(jsonAddress)
                
#        if entry.birthday:
#            print entry.birthday
#        print entry.system_group
        if entry.group_membership_info:
            jsonObject["groups"] = []
            for group in entry.group_membership_info:
                jsonObject["groups"].append(group.href[-16:])
        
        #print json.dumps(jsonObject)
        jsonFile.write(json.dumps(jsonObject) + '\n')
        try:
            hosted_image_binary = gd_client.GetPhoto(entry)
            #print hosted_image_binary
            if hosted_image_binary:
                image_file = open('my/photos/{0}.jpg'.format(jsonObject["id"]), 'wb')
                image_file.write(hosted_image_binary)
                image_file.close()
        except gdata.service.RequestError:
            pass

def write_groups_feed_to_file(gd_client):
    feed = gd_client.GetGroupsFeed()
    jsonFile = open('my/{0}.groups.json'.format(GetUIDHash(gd_client)), 'w')
    for i, entry in enumerate(feed.entry):
        jsonObject = {}
        indexOfSlash = entry.id.text.rfind("/")
        jsonObject["id"] = entry.id.text[indexOfSlash+1:]
        #jsonObject["id"] = entry.id.text[-16:]
        jsonObject["name"] = entry.title.text
        jsonFile.write(json.dumps(jsonObject) + '\n')

def GetUIDHash(gd_client):
    m = hashlib.sha1()
    m.update(gd_client.email)
    return m.hexdigest()
    

def main():
    try:
        os.makedirs("my/photos")
    except OSError:
        pass
    
    gd_client = gdata.contacts.service.ContactsService()
    if len(sys.argv) != 3:
        print "usage: python gcontacts.py <username> <password>"
        exit()
    gd_client.email = sys.argv[1]
    gd_client.password = sys.argv[2]
    gd_client.source = 'locker-0.1'
    gd_client.ProgrammaticLogin()
    write_groups_feed_to_file(gd_client)
    write_feed_to_file(gd_client)


if __name__ == '__main__':
	main()

