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
    # Process the startup JSON object (json.loads will take utf-8 directly)
    json_input = []
    input_error = None
    for line in sys.stdin:
        json_input.append(line)
        try:
            info = json.loads(''.join(json_input))
            break
        except ValueError, e:
            input_error = e
    else:
        logging.error("synclet parsing of stdin failed - %s" % input_error)
        exit(1)
    logging.debug("info on stdin: %s" % (info,))

    run(info)

