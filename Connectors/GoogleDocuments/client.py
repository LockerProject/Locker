#
# Copyright (C) 2011, The Locker Project
# All rights reserved.
#
# Please see the LICENSE file for more information.
#

import sys
import os
import gdata.docs.data
import gdata.docs.client
import gdata.spreadsheet.service

#gd_client.email = sys.argv[1]
#gd_client.password = sys.argv[2]

client = gdata.docs.client.DocsClient(source='yourCo-yourAppName-v1')
client.ssl = True  # Force all API requests through HTTPS
client.http_client.debug = False  # Set to True for debugging HTTP requests

client.ClientLogin(sys.argv[1], sys.argv[2], client.source);

spreadsheets_client = gdata.spreadsheet.service.SpreadsheetsService(source='yourCo-yourAppName-v1')
spreadsheets_client.ClientLogin(sys.argv[1], sys.argv[2], client.source)

# substitute the spreadsheets token into our client
docs_token = client.auth_token
ss_token = gdata.gauth.ClientLoginToken(spreadsheets_client.GetClientLoginToken())

def PrintFeed(feed):
    
    doc_dir = "my/{0}".format(sys.argv[1])
    
    try:
        os.makedirs(doc_dir)
    except OSError:
        pass
        
    print '\n'
    if not feed.entry:
        print 'No entries in feed.\n'
    for entry in feed.entry:
        print entry.title.text.encode('UTF-8'), entry.GetDocumentType(), entry.resource_id.text
        file_path = doc_dir + '/' + entry.title.text
        client.auth_token = docs_token
        if entry.GetDocumentType() == 'spreadsheet':
            client.auth_token = ss_token
            if not file_path.endswith('.xls'):
                file_path += '.xls'
            print 'Exporting spreadsheet to %s...' % file_path
            client.Export(entry, file_path)
            print 'Exported %s as ' % entry.title.text
            continue
        elif entry.GetDocumentType() == 'document':
            if not file_path.endswith('.doc'):
                file_path += '.doc'
            print 'Exporting document to %s...' % file_path
            client.Export(entry, file_path)
            print 'Exported %s as a .doc file' % entry.title.text
        else:
            if entry.GetDocumentType() == 'image/png' and not file_path.endswith('.png'):
                file_path += '.png'
            elif entry.GetDocumentType() == 'image/jpg' and not file_path.endswith('.jpg'):
                file_path += '.jpg'
            elif entry.GetDocumentType() == 'image/jpeg' and not file_path.endswith('.jpg'):
                file_path += '.jpg'
                
            print 'Downloading file to %s...' % file_path
            client.Download(entry, file_path)
            print 'Downloaded %s' % entry.title.text
            continue

        # List folders the document is in.
        for folder in entry.InFolders():
          print folder.title

feed = client.GetDocList()
PrintFeed(feed)