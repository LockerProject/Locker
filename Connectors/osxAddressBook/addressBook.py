#
# Copyright (C) 2011, The Locker Project
# All rights reserved.
#
# Please see the LICENSE file for more information.
#

from AddressBook import *
import json
import os

def dataOrRaise(x):
    if not x:
        raise Exception("None")
    return x

def defaultOp(container, containerKey):
    return dataOrRaise(container.valueForProperty_(containerKey))

def addDataIfValid(targetObject, targetKey, container, containerKey, op=None):
    op = op or defaultOp
    try:
        targetObject[targetKey] = op(container, containerKey)
    except Exception:
        pass

def addListIfValid(targetObject, targetKey, multivalue, op=None):
    def defaultRetOp(data):
        return data
    op = op or defaultRetOp
    if multivalue:
        targetObject[targetKey] = []
        for x in range(multivalue.count()):
            targetObject[targetKey].append({"type":multivalue.labelAtIndex_(x)[4:-4], "value":op(multivalue.valueAtIndex_(x))})

def formatAdressRecord(record):
    return "{0} {1}, {2}  {3} {4}".format(record.valueForKey_(kABAddressStreetKey), record.valueForKey_(kABAddressCityKey),
        record.valueForKey_(kABAddressStateKey), record.valueForKey_(kABAddressZIPKey), record.valueForKey_(kABAddressCountryKey) or "").rstrip()

def gatherContacts():
    ab = ABAddressBook.sharedAddressBook()
    allPeople = ab.people()

    try:
        os.mkdir("my")
    except OSError:
        pass
    fd = open("my/contacts.json", "w")

    for person in allPeople:
        jsonData = {}
        recordID = person.valueForProperty_(kABUIDProperty)[:-9]
        # Dropped middle name for now
        jsonData["id"] = recordID
        jsonData["name"] = u"{0} {1}".format(person.valueForProperty_("First"), person.valueForProperty_("Last") or "").strip()
        addDataIfValid(jsonData, "nickname", person, kABNicknameProperty)
        addDataIfValid(jsonData, "birthday", person, kABBirthdayProperty, lambda x,y:str(dataOrRaise(defaultOp(x, y))))
        addListIfValid(jsonData, "phone", person.valueForProperty_(kABPhoneProperty))
        addListIfValid(jsonData, "email", person.valueForProperty_(kABEmailProperty))
        addListIfValid(jsonData, "address", person.valueForProperty_(kABAddressProperty), formatAdressRecord)
        # Gross, there's no single aggregate property with all of the IM networks in one
        ims = []
        for key in (("aim",kABAIMInstantProperty), ("icq",kABICQInstantProperty), ("jabber",kABJabberInstantProperty), ("msn",kABMSNInstantProperty), ("yahoo",kABYahooInstantProperty)):
            val = person.valueForProperty_(key[1])
            if val: 
                for x in range(val.count()):
                    ims.append({"type":key[0], "value":val.valueAtIndex_(x)})
        if len(ims): jsonData["im"] = ims

        # We'll save out a copy of the image data for easier access
        image = person.imageData();
        path = "my/{0}.jpg".format(recordID)
        if image: image.writeToFile_atomically_(path, False)
        jsonData["avatar"] = [path]

        groups = []
        for group in ab.groups():
            if group.members().containsObject_(person): groups.append(group.valueForProperty_(kABUIDProperty)[:-9])
        if len(groups): jsonData["groups"] = groups

        json.dump(jsonData, fd)
        fd.write("\n")

def gatherGroups():
        """This only takes the top level groups currently."""
        ab = ABAddressBook.sharedAddressBook()
        groups = ab.groups()
        if not groups.count(): return
        fd = open("my/groups.json", "w")
        for group in groups:
            json.dump({"id":group.valueForProperty_(kABUIDProperty)[:-9], "name":group.name()}, fd)
            fd.write("\n")
    

if __name__ == "__main__":
    gatherContacts()
    gatherGroups()
