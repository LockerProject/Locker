#
# Copyright (C) 2011, The Locker Project
# All rights reserved.
#
# Please see the LICENSE file for more information.
#

import getpass, imaplib, sys, os, json

host = sys.argv[1]
user = sys.argv[2]

IMAP = imaplib.IMAP4_SSL(host)
#IMAP.login_cram_md5(sys.argv[2], getpass.getpass())
IMAP.login(user, getpass.getpass())
IMAP.select()
print IMAP.capabilities
print "fetching all, this could take some time"

typ, data = IMAP.fetch("1:*", "(BODY.PEEK[HEADER.FIELDS (FROM TO CC DATE SUBJECT MESSAGE-ID)])")

try:
    os.mkdir("my")
    os.mkdir("my/%s" % user)
except OSError:
    pass
fd = open("my/%s/headers.json" % user, "w")

for x in range(0, len(data), 2):
    head = data[x][1].split('\r\n')
    dhead = {}
    for line in head:
        la = line.split(': ',1)
        if len(la) == 2:
            dhead[la[0].lower()] = la[1]
    json.dump(dhead,fd)
    fd.write("\n")

IMAP.close()
IMAP.logout()
