import sys
import time
import logging
import json
import xmlrpclib

sys.path.append("../../Common/python")
import lockerfs

import util

server_types = ["wordpress"] # !!! check url changes for other server types

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
    def __init__(self, url, user, password, server_type="wordpress"):
        assert(server_type in server_types)

        if server_type == "wordpress":
            self.url = url + "/xmlrpc.php"
        else:
            self.url = url

        self.user = user
        self.password = password
        self.server_type = server_type

        self.blogs = {}
        self.posts = {}
        self.categories = {}

        self._server = xmlrpclib.ServerProxy(self.url)
        self.update()

    def getUserInfo(self):
        return self._server.blogger.getUserInfo('', self.user, self.password)

    def getUsersBlogs(self):
        return self._server.blogger.getUsersBlogs('', self.user, self.password)

    def getPosts(self, blogid):
        return self._server.metaWeblog.getRecentPosts(blogid, self.user, self.password, 1000000000) # horrible hack

    def getCategories(self, blogid):
         return self._server.metaWeblog.getCategories(blogid, self.user, self.password)

    def getPingbacks(self, postUrl):
        return self._server.pingback.extensions.getPingbacks(postUrl)

    def getTrackbackPings(self, postId):
        return self._server.mt.getTrackbackPings(postId)

    def update(self):
        self.user_info = dict_to_json(self.getUserInfo())

        self.blogs = {}
        for blog in self.getUsersBlogs():
            self.blogs[blog['blogid']] = dict_to_json(blog)

        self.posts = {}
        for blogid in self.blogs:
            for post in self.getPosts(blogid): 
                post['blogid'] = blogid
                if self.server_type == "wordpress":
                    post['pingbacks'] = self.getPingbacks(post['link'])
                    post['trackbacks'] = self.getTrackbackPings(post['postid'])
                else:
                    post['pingbacks'] = None
                    post['trackbacks'] = None
                self.posts[post['postid']] = dict_to_json(post)

        self.categories = {}
        for blogid in self.blogs:
            for category in self.getCategories(blogid):
                self.categories[category['categoryId']] = dict_to_json(category)

def test_login():
    url = "http://lockertest.wordpress.com/"
    username = "lockertest"
    password = "stopbreakingmyshit"
    return Client(url, username, password)

if __name__ == "__main__":
    client = test_login()
    for item in client.blogs.values() + client.posts.values() + client.categories.values():
        print item
