#!/usr/bin/env python
# encoding: utf-8

"""
test.py

Created by Simon Murtha-Smith on 2010-12-06.
"""

import sys
import os
import atom
import gdata.contacts
import gdata.contacts.service
import json

def PrintFeed(gd_client):
    feed = gd_client.GetContactsFeed()
    for i, entry in enumerate(feed.entry):
        jsonObject = {}
        #print dir(entry)
        print '\n%s %s' % (i+1, entry.title.text)
        
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
          #  print "entry.phone_number"
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
          #  print dir(entry.postal_address)
#            print entry.postal_address
            jsonObject["address"] = []
            #print "entry.postal_address"
            for postalAddress in entry.postal_address:
                jsonAddress = {}
#                print postalAddress.text
                jsonAddress["value"] = postalAddress.text
                label = postalAddress.rel or postalAddress.label
                indexOfHash = label.find("#")
                label = label[indexOfHash+1:]
                if label != 'other':
                    jsonAddress["type"] = label
                jsonObject["address"].append(jsonAddress)
                
#        if entry.birthday:
#            print entry.birthday
        
        print json.dumps(jsonObject)
    hosted_image_binary = gd_client.GetPhoto(entry)
    if hosted_image_binary:
        image_file = open(str.join(entry.title.text, '.jpg'), 'wb')
        image_file.write(hosted_image_binary)
        image_file.close()

def main():
	gd_client = gdata.contacts.service.ContactsService()
	gd_client.email = 'mr.locker.test@gmail.com'
	gd_client.password = 'mrslockertest'
	gd_client.source = 'locker-test-0.1'
	gd_client.ProgrammaticLogin()
	PrintFeed(gd_client)


if __name__ == '__main__':
	main()

