from AddressBook import *
import json

ab = ABAddressBook.sharedAddressBook()
allPeople = ab.people()

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

def groupsListForPerson(groups, person):
    resultGroups = []
    for group in groups:
        if group.members().containsObject_(person):
            resultGroups.append(group.name())
        resultGroups.extend(groupsListForPerson(group.subgroups(), person))
    return resultGroups

fd = open("my/contacts.json", "w")
for person in allPeople:
    jsonData = {}
    # Dropped middle name for now
    jsonData["name"] = u"{0} {1}".format(person.valueForProperty_("First"), person.valueForProperty_("Last") or "").strip()
    addDataIfValid(jsonData, "osxAB_UID", person, kABUIDProperty)
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
    if len(ims) > 0:
        jsonData["im"] = ims

    # We'll save out a copy of the image data for easier access
    image = person.imageData();
    path = "my/{0}.jpg".format(person.valueForProperty_(kABUIDProperty)[:-9])
    if image: image.writeToFile_atomically_(path, False)
    jsonData["avatar"] = [path]

    # We redo all of the groups here otherwise we can't do the people as if they are single pass.
    # If you think of a better way to optimize this then fix it.
    groups = groupsListForPerson(ab.groups(), person)
    if len(groups): jsonData["groups"] = groups

    json.dump(jsonData, fd)
    fd.write("\n")
