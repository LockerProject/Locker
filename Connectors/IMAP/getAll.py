import getpass, imaplib, sys, os, json, email
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

    def __init__(self, host, username):
        self.use_ssl = True
        self.lastUIDs = {}
        self.host = host
        self.username = username
        self.mailboxes = Mailbox("INBOX")
        try:
            lastUIDsFile = open("my/%s/lastUIDS.json" % (username), "r")
            self.lastUIDs = json.load(lastUIDsFile)
            lastUIDsFile.close()
        except IOError:
            pass

    def process(self):
        self.IMAP = imaplib.IMAP4_SSL(self.host)
        #self.IMAP.login_cram_md5(self.username, getpass.getpass())
        self.IMAP.login(self.username, getpass.getpass())
        if len(self.lastUIDs) == 0:
            print "This is a fresh fetch of everything and could take a long time..."
        else:
            print "Updating..."
        results = self.IMAP.list()[1]
        for r in results:
            print r
        ## Go through all the results and organize them
        for box in results:
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
        print "Data: (%s)(%d)%s" % (typ, len(data), data)
        if typ == "OK" and len(data[0]) != 0:
            ids = data[0].split(" ")
            try:
                os.makedirs("my/%s/%s" % (self.username, fullname))
            except OSError:
                pass
            for mailID in ids:
                self.getMessage(mailID, fullname)
                
        # dump our last UIDs again before we process children just in case there's an error, dont' need to redo it
        lastUIDsFile = open("my/%s/lastUIDS.json" % (self.username), "w")
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
        typ, header = self.IMAP.fetch(mailID, "(UID BODY.PEEK[HEADER])")
        typ, body = self.IMAP.fetch(mailID, "(UID BODY.PEEK[])")
        for x in range(0, len(header), 2):
            firstPart = header[x][0]
            uidStart = firstPart.find("UID ") + 4
            uidEnd = firstPart.find(" ", uidStart)
            uid = int(firstPart[uidStart:uidEnd])
            if uid > self.lastUIDs[fullname]: self.lastUIDs[fullname] = uid
            print "UID %s in %s" % (uid, fullname)
            #info = data[x][0]
            msgFD = open("my/%s/%s/%s" % (self.username, fullname, uid), "w")
            mssg = email.message_from_string(body[x][1])
            message = {"header":header, "body":{}}
            for part in mssg.walk():
                maintype = part.get_content_maintype();
                mtype = part.get_content_type();
                # multipart are just containers, so we skip them
                if maintype == 'multipart':
                    continue
                
                message["body"][mtype] = {"payload":part.get_payload()};
            json.dump(message, msgFD)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print "Usage: %s <imap host> <imap username>" % (sys.argv[0])
        sys.exit(1)
    processor = MailboxProcessor(sys.argv[1], sys.argv[2])
    processor.process()
