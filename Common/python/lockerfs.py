import json
import sys

def loadJsonFile(filename):
    try:
        fd = open(filename, "r")
        meData = json.load(fd)
        fd.close()
        return meData
    except Exception, E:
        return {}

def saveJsonFile(filename, jsonData):
    fd = open(filename, "w")
    json.dump(jsonData, fd)
    fd.close()

def loadMeData():
    return loadJsonFile("me.json")

def saveMeData(me):
    saveJsonFile("me.json", me)


__all__ = ["loadMeData"]
