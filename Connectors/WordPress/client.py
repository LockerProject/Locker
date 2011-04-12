import sys
import time
import logging
import json
import xmlrpclib

sys.path.append("../../Common/python")
import lockerfs

import util

server_types = ["blogger", "metaweblog", "wordpress"] # !!! check url changes for other server types

def dict_to_json(dict):
    data = {}
    for key, value in dict.items():
        try:
            # if json compatible use the value directly
            json.dumps(value)
            data[key] = value
        except:
            # otherwise coerce to string
            data[key] = str(value)
    return data

class Client(object):
    def __init__(self, app_info, url, user, password, server_type="wordpress"):
        self.app_info = app_info

        assert(server_type in server_types)

        url = 'http://' + url.rstrip('/').lstrip('http://')
        if server_type == "wordpress":
            self.url = url + "/xmlrpc.php"
        else:
            self.url = url

        logging.info("Url: %s" % self.url)

        self.user = user
        self.password = password
        self.server_type = server_type

        self._server = xmlrpclib.ServerProxy(self.url)
        self.update()

    def getUserInfo(self):
        return self._server.blogger.getUserInfo('', self.user, self.password)

    def getUsersBlogs(self):
        return self._server.blogger.getUsersBlogs('', self.user, self.password)

    def getPosts(self, blogid):
        if self.server_type in ["metaweblog", "wordpress"]:
            return self._server.metaWeblog.getRecentPosts(blogid, self.user, self.password, 1000000000) # horrible hack
        elif self.server_type == "blogger":
            return self._server.blogger.getRecentPosts(blogid, self.user, self.password, 1000000000) # also horrible hack
        else:
            return []

    def getComments(self, postid):
        if self.server_type == "wordpress":
            return self._server.wp.getComments(postid, self.user, self.password)
        else:
            return []

    def getCategories(self, blogid):
        if self.server_type in ["metaweblog", "wordpress"]:
            return self._server.metaWeblog.getCategories(blogid, self.user, self.password)
        else:
            return []

    def getPingbacks(self, postUrl):
        if self.server_type == "wordpress":
            return self._server.pingback.extensions.getPingbacks(postUrl)
        else:
            return []

    def getTrackbackPings(self, postId):
        if self.server_type == "wordpress":
            return self._server.mt.getTrackbackPings(postId)
        else:
            return []

    def update(self):
        logging.info("Updating...")

        self.user_info = dict_to_json(self.getUserInfo())

        self.blogs = map(dict_to_json, self.getUsersBlogs())

        self.posts = []
        self.pingbacks = []
        self.trackbackPings = []
        self.comments = []
        self.categories = []

        for blog in self.blogs:
            self.categories.extend(map(dict_to_json, self.getCategories(blog)))
            for post in self.getPosts(blog['blogid']): 
                post['blogid'] = blog['blogid']
                self.posts.append(dict_to_json(post))
                self.pingbacks.extend(self.getPingbacks(post['link']))
                self.trackbackPings.extend(map(dict_to_json, self.getTrackbackPings(post['postid'])))
                self.comments.extend(map(dict_to_json, self.getComments(post['postid'])))

def test_login():
    url = "lockertest.wordpress.com"
    username = "lockertest"
    password = "stopbreakingmyshit"
    return Client(None, url, username, password)

if __name__ == "__main__":
    client = test_login()
    for item in client.blogs + client.posts + client.categories + client.comments + client.pingbacks + client.trackbackPings:
        print item
