import sys
sys.path.append("../../Common/python")
import os
import json
import threading
import time
import webservice
import socket

def testListenPort(port):
    """Test if a port can be listened on."""
    try:
        test_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        test_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        test_socket.bind(("localhost", port))
        usedPort = test_socket.getsockname()[1]
        test_socket.close()
        return usedPort
    except Exception, E:
        print E
        return 0

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

if __name__ == "__main__":
    infoStr = sys.stdin.readline()
    info = json.loads(infoStr)
    # Make sure we can use the offered port or pick one
    port = info["port"]
    if testListenPort(port) == 0:
        # We're asking for a random available port here
        port = testListenPort(0)
    info["port"] = port
    os.chdir(info["workingDirectory"])
    sys.stderr.write("Switching to " + info["workingDirectory"])
    sys.stderr.flush()
    # We have to use a thread here to see if the startup has finished to avoid race conditions
    notifierThread = startNotifierThread(info)
    notifierThread.start()
    try:
        webservice.runService(info)
        notifierThread.join()
    except KeyboardInterrupt, e:
        print "Ending..."
