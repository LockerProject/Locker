#
# Copyright (C) 2011, The Locker Project
# All rights reserved.
#
# Please see the LICENSE file for more information.
#

import getpass, imaplib, sys, os, json, email
from email.utils import getaddresses
from pyparsing import Word, alphas, Optional, ZeroOrMore, QuotedString, Or, Literal, delimitedList, White, Group

class Mailbox:
    def __init__(self, name):
        self.name = name
        self.separator = "."
        self.children = []
        self.flags = []
    def __repr__(self):
        return "Mailbox(\"%s\")" % (self.name)

def find(f, seq):
    for item in seq:
        if f(item):
            return item

class MailboxProcessor:
    ## Pyparsing syntax for the list result    
    MboxFlag = Literal("\\").suppress() + Word(alphas)
    FlagList = Literal("(").suppress() + Group(delimitedList(MboxFlag, delim=White(" ",exact=1)))  + Literal(")").suppress()
    listParser = FlagList + QuotedString(quoteChar="\"") + (QuotedString(quoteChar="\"") ^ Word(alphas))

    def __init__(self, host, username, password):
        self.use_ssl = True
        self.lastUIDs = {}
        self.host = host
        self.username = username
        self.password = password
        self.mailboxes = Mailbox("INBOX")
        self.counter = 0
        try:
            lastUIDsFile = open("%s/lastUIDS.json" % (username), "r")
            self.lastUIDs = json.load(lastUIDsFile)
            lastUIDsFile.close()
        except IOError:
            pass

    def process(self):
        self.IMAP = imaplib.IMAP4_SSL(self.host)
        #self.IMAP.login_cram_md5(self.username, getpass.getpass())
        self.IMAP.login(self.username, self.password)
        if len(self.lastUIDs) == 0:
            print "This is a fresh fetch of everything and could take a long time..."
        else:
            print "Updating..."
        allMailBoxes = self.IMAP.list()[1]
        ## Go through all the mail boxes and organize them (parent-child relationships)
        for box in allMailBoxes:
            boxParts = self.listParser.parseString(box)
            if boxParts[2] == "INBOX":
                continue
            curBox = self.mailboxes
            for part in boxParts[2].split(boxParts[1])[:-1]:
                curBox = find(lambda b: b.name == part, curBox.children)
            print "Adding",boxParts[2]," to ",curBox.name
            newBox = Mailbox(boxParts[2].split(boxParts[1])[-1])
            newBox.separator = boxParts[1]
            newBox.flags = boxParts[0]
            curBox.children.append(newBox)
        
        self.processMailboxAndChildren(self.mailboxes)
        print "Success."
        self.IMAP.logout()

    def selectAndProcessMailbox(self, fullname, mailbox):
        if "Noselect" in mailbox.flags: 
            return
        res, data = self.IMAP.select(fullname, readonly=True)
        if res == "NO": 
            print "Res(%s) Data: %s" % (res, data)
            return
        print "Select on ",mailbox.name,":",data
        try:
            maxuid = self.lastUIDs[fullname]
        except KeyError:
            self.lastUIDs[fullname] = 0
            maxuid = 0
        if maxuid == 0:
            searchQuery = "ALL"
        else:
            searchQuery = "(NOT (UID 1:%d))" % maxuid
        typ, data = self.IMAP.search(None, searchQuery)
#        print "Data: (%s)(%d)%s" % (typ, len(data), data)
        if typ == "OK" and len(data[0]) != 0:
            ids = data[0].split(" ")
            try:
                os.makedirs("%s/%s" % (self.username, fullname))
            except OSError:
                pass
            for mailID in ids:
                self.getMessage(mailID, fullname)
                
        # dump our last UIDs again before we process children just in case there's an error, dont' need to redo it
        lastUIDsFile = open("%s/lastUIDS.json" % (self.username), "w")
        json.dump(self.lastUIDs, lastUIDsFile)
        lastUIDsFile.close()
        

    def processMailboxAndChildren(self, mailbox, prevName=""):
        fullname = prevName + mailbox.name
        self.selectAndProcessMailbox(fullname, mailbox)
        # process all the child mailboxes
        for child in mailbox.children:
            nextName = mailbox.name + child.separator
            if mailbox.name == "INBOX": nextName = ""
            print "Recursing into ",child.name
            ## OOOOHhhh scary recursion
            self.processMailboxAndChildren(child, nextName)
            
    def getMessage(self, mailID, fullname):
        typ, headerList = self.IMAP.fetch(mailID, "(UID BODY.PEEK[HEADER])")
        header = headerList[0]
        firstPart = header[0]
        uidStart = firstPart.find("UID ") + 4
        uidEnd = firstPart.find(" ", uidStart)
        uid = int(firstPart[uidStart:uidEnd])
        if os.path.exists("%s/%s/%s" % (self.username, fullname, uid)):
            print 'UID %s exists' % (uid)
            return
        if uid > self.lastUIDs[fullname]: self.lastUIDs[fullname] = uid
        print "UID %s in %s" % (uid, fullname)
        typ, bodyList = self.IMAP.fetch(mailID, "(UID BODY.PEEK[])")
        body = bodyList[0]
        msgFD = open("%s/%s/%s" % (self.username, fullname, uid), "w")
        mssg = email.message_from_string(body[1])
        hdrmsg = email.message_from_string(body[1])
        jsonHeader = {};
        for key in hdrmsg.keys():
            jsonHeader[key] = hdrmsg[key]
        #parse the email address lists into a usable format
        for key in ['To', 'From', 'Cc', 'Bcc']:
            jsonHeader[key] = self.getAddrs(hdrmsg, key)
        
        message = {"headers":jsonHeader, "body":{"parts":{}}, "attachments": []}
        for part in mssg.walk():
            maintype = part.get_content_maintype();
            mtype = part.get_content_type();
            # multipart are just containers, so we skip them
            if maintype == 'multipart':
                continue
            if maintype == 'text':
                message["body"]["parts"][mtype] = {"payload":part.get_payload()};
            elif part.get('Content-Disposition') is not None:
                print 'getting attachment of type ' + mtype
                orig_filename, saved_filename = self.getAttachment(part, "%s/%s" % (self.username, fullname), uid)
                if saved_filename is not None:
                    attachment = {"orig_filename": orig_filename, "saved_filename": saved_filename, "type": mtype}
                else:
                    attachment = {"orig_filename": orig_filename, "error": "Could not save file", "type": mtype}
                message["attachments"].append(attachment)
        try:
            json.dump(message, msgFD)
        except:
            try:
                message = {"error":"Message download failed!!!"};
                json.dump(message, msgFD)
            except:
                print "ERRRORZ: MESSAGE FAILED TO SAVE WITH UID %s" % (uid)
    
    def getAddrs(self, msgHeaders, fieldName):
        temp = msgHeaders[fieldName]
        if temp is not None:
            return getaddresses([temp])
        return []
    
    def getAttachment(self, part, directory, UID):  
        try:  
            filename = part.get_filename()
            # if there is no filename, we create one with a counter to avoid duplicates
            if not filename:
                filename = 'part-%03d%s' % (self.counter, 'bin')
                self.counter += 1
            directory += '/attachments'
            if not os.path.exists(directory):
                os.makedirs(directory)
        
            saved_filename = ("%s_" % (UID))  + filename;
            att_path = os.path.join(directory, saved_filename)
            inc = 0;
            while os.path.isfile(att_path):
                print str(inc)
                inc+=1
                saved_filename = ("%s_%s_" % (UID,inc))  + filename;
                att_path = os.path.join(directory, saved_filename)
            #Check if its already there
            if not os.path.isfile(att_path) :
                # finally write the stuff
                payload = part.get_payload(decode=True)
                if payload is not None:
                    fp = open(att_path, 'wb')
                    fp.write(payload)
                    fp.close()
                    return filename, saved_filename
        except Exception as ex:
            print type(ex)     # the exception instance
            print ex.args      # arguments stored in .args
            print ex           # __str__ allows args to printed directly
            pass
        
        #something bad happened
        return filename, None
    

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print "Usage: %s <imap host> <imap username>" % (sys.argv[0])
        sys.exit(1)
    processor = MailboxProcessor(sys.argv[1], sys.argv[2], getpass.getpass())
    processor.process()
