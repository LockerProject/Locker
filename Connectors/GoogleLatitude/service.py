import sys, os, socket
import threading, time
import signal
import json
import logging

import webservice

def testListenPort(port):
    """Test if a port can be listened on."""
    try:
        test_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        test_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        test_socket.bind(("localhost", port))
        usedPort = test_socket.getsockname()[1]
        test_socket.close()
        return usedPort
    except Exception, exc:
        logging.error("Failed to open port: %s" % exc)
        return None

class startNotifierThread(threading.Thread):
    """Will watch for the webservice to start and then send out the JSON result to stdout."""
    def __init__(self, jsonInfo, total_attempts=5, timeout=1.0):
        super(startNotifierThread, self).__init__()
        self.jsonInfo = jsonInfo
        self.port = self.jsonInfo["port"]
        self.timeout = timeout
        self.total_attempts = total_attempts

    def run(self):
        # We test the port for being up and report when it is
        for x in range(self.total_attempts):
            try:
                sock = socket.create_connection(("localhost", self.port), self.timeout)
                sock.close()
                sys.stdout.write(json.dumps(self.jsonInfo))
                sys.stdout.flush()
                return True
            except socket.error, e:
                if x >= self.total_attempts:
                    return False
            time.sleep(self.timeout)

def die(reason):
    logging.error("Dying because of: %s" % reason)
    os.kill(os.getpid(), 9)

if __name__ == "__main__":
    def die_sigint(signal, stack):
        die("SIGINT")
    signal.signal(signal.SIGINT, die_sigint)

    logging.basicConfig(level=logging.INFO,
                        format='%(levelname)-8s %(message)s')
    logging.info("Starting")

    info = json.loads(sys.stdin.readline())
    logging.info("Core info: %s" % info)

    # Make sure we can use the offered port or pick one
    port = testListenPort(info["port"]) or testListenPort(0)
    info["port"] = port

    os.chdir(info["workingDirectory"])
    logging.info("Switching to %s" % info["workingDirectory"])

    # We have to use a thread here to see if the startup has finished to avoid race conditions
    notifierThread = startNotifierThread(info)
    notifierThread.start()
    webservice.runService(info)
    notifierThread.join()
