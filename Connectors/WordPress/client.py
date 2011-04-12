import sys
import time
import logging
import json

import wordpresslib

sys.path.append("../../Common/python")
import lockerfs

import util

def obj_to_json(obj):
    data = {}
    for key, value in obj.__dict__.items():
        try:
            # if json compatible use the value directly
            json.dumps(value)
            data[key] = value
        except:
            # otherwise coerce to string
            data[key] = str(value)
    return data

class Client(object):
    def __init__(self, url, username, password):
        url = url + "/xmlrpc.php"
        self.wp = wordpresslib.WordPressClient(url, username, password)
        self.update()

    def update(self):
        posts = list(self.wp.getRecentPosts(1000000000)) # horrible hack
        for post in posts:
            post.pingbacks = self.wp.getPingbacks(post.permaLink)
            post.trackbackPings = self.wp.getTrackbackPings(post.id)
        self.posts = map(obj_to_json, posts)

def test_login():
    url = "http://lockertest.wordpress.com/"
    username = "lockertest"
    password = "stopbreakingmyshit"
    return Client(url, username, password)

if __name__ == "__main__":
    client = test_login()
    for post in client.posts:
        print post
