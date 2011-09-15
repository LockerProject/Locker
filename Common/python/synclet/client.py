##
#
# Copyright (C) 2011, The Locker Project
# All rights reserved.
#
# Please see the LICENSE file for more information.
#
##

import json
import logging
import os
import sys

def run(process_info):
    run = process_info['syncletToRun']
    #process.title += " :: provider=" + processInfo.provider + " synclet=" + processInfo.syncletToRun.name;
    logging.debug("importing %s from %s" % (run['run'], os.getcwd()))
    sys.path.insert(0, os.getcwd())
    sync = __import__((run['run'].rpartition('.'))[0])
    os.chdir(run['workingDirectory'])

    try:
        returned_info = sync.sync(process_info)
    except Exception, e:
        logging.warn("synclet '%s' failed to sync: %s" % (run['name'], e))
        returned_info = e
    logging.debug("info returned from synclet: %s" % (returned_info,))

    try:
        try:
            sys.stdout.write(json.dumps(
                returned_info, ensure_ascii=False).encode('utf-8'))
        except (ValueError, TypeError), e:
            sys.stdout.write(json.dumps(
                "error decoding synclet return value to json: %s" % (e,)))
    except IOError, e:
        logging.error("error writing synclet results to stdout: %s" % (e,))

if __name__ == "__main__":
    #logging.getLogger().setLevel('DEBUG')

    # Process the startup JSON object
    # We can't use the usual "for line in sys.stdin" idiom because the
    # file-object iterator reads ahead past the end of the current line and
    # will hang when there's no more input but stdin stays open.
    json_input = []
    input_error = None
    line = sys.stdin.readline()
    # XXX: this will never exit if malformed json input is received but stdin
    # is kept open by the sender
    while line != "": # readline() returns "" on EOF
        json_input.append(line)
        try:
            # json.loads will take utf-8 directly
            info = json.loads(''.join(json_input))
            break
        except ValueError, e:
            input_error = e
        line = sys.stdin.readline()
    else:
        logging.error("synclet parsing of stdin failed - %s" % input_error)
        exit(1)
    logging.debug("info on stdin: %s" % (info,))

    run(info)

