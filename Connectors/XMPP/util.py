import os
import logging

def die(reason):
    logging.error("Dying because of: %s" % reason)
    os.kill(os.getpid(), 9)
