import sys
import time
import logging
import json
import xmlrpclib
import httplib

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

def push_event(url, service_id, event_type, event):
    data = json.dumps({
            "id": service_id,
            "type": event_type,
            "obj": event
            })
    logging.info("Pushing event: %s" % data)
    headers = {"Content-type": "application/json"}
    url = url.rstrip("/").lstrip("http:/")
    conn = httplib.HTTPConnection(url)
    conn.request("POST", "/core/" + service_id + "/event", data, headers)
    status = conn.getresponse().status
    if status != 200:
        logging.error("push_event failed with code %s" % status)
    conn.close()

def updater(name, event_type=None, default=[]):
    def transform(fun):
        def update(self):
            logging.info("Updating %s" % name)
            old_value = self.__dict__.get(name, None) or lockerfs.loadJsonFile(name + ".json") or default
            new_value = fun(self)
            self.__dict__[name] = new_value
            if event_type:
                for item in new_value:
                    if item not in old_value:
                        push_event(self.core_info["lockerUrl"], self.me_info["id"], event_type, item)
            lockerfs.saveJsonFile(name + ".json", new_value)
        return update
    return transform

class Client(object):
    def __init__(self, core_info, url, user, password, server_type="wordpress"):
        self.core_info = core_info
        self.me_info = lockerfs.loadJsonFile("me.json")

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

        self.user_info = lockerfs.loadJsonFile("user_info.json")
        self.blogs = lockerfs.loadJsonFile("blogs.json")
        self.categories = lockerfs.loadJsonFile("categories.json")
        self.posts = lockerfs.loadJsonFile("posts.json")
        self.comments = lockerfs.loadJsonFile("comments.json")
        self.pingbacks = lockerfs.loadJsonFile("pingbacks.json")
        self.trackbacks = lockerfs.loadJsonFile("trackbacks.json")

    @updater('user_info', default={})
    def updateUserInfo(self):
        raw_user_info = self._server.blogger.getUserInfo('', self.user, self.password)
        return dict_to_json(raw_user_info)

    @updater('blogs', event_type='blog/wordpress')
    def updateBlogs(self):
        raw_blogs = self._server.blogger.getUsersBlogs('', self.user, self.password)
        return map(dict_to_json, raw_blogs)

    @updater('categories', event_type='category/wordpress')
    def updateCategories(self):
        categories = []
        for blog in self.blogs:
            blogid = blog['blogid']
            raw_categories = []
            if self.server_type in ["metaweblog", "wordpress"]:
                raw_categories = self._server.metaWeblog.getCategories(blogid, self.user, self.password)
            categories.extend(map(dict_to_json, raw_categories))
        return categories

    @updater('posts', event_type='post/wordpress')
    def updatePosts(self):
        posts = []
        for blog in self.blogs:
            blogid = blog['blogid']
            raw_posts = []
            if self.server_type in ["metaweblog", "wordpress"]:
                # horrible hack
                raw_posts = self._server.metaWeblog.getRecentPosts(blogid, self.user, self.password, 1000000000)
            elif self.server_type == "blogger":
                # also horrible hack
                raw_posts = self._server.blogger.getRecentPosts(blogid, self.user, self.password, 1000000000)
            for post in raw_posts:
                post['blogid'] = blogid
            posts.extend(map(dict_to_json, raw_posts))
        return posts

    @updater('comments', event_type='comment/wordpress')
    def updateComments(self):
        comments = []
        for post in self.posts:
            postid = post['postid']
            raw_comments = []
            if self.server_type == "wordpress":
                raw_comments = self._server.wp.getComments(postid, self.user, self.password)
            comments.extend(map(dict_to_json, raw_comments))
        return comments

    @updater('pingbacks', event_type='pingback/wordpress')
    def updatePingbacks(self):
        pingbacks = []
        for post in self.posts:
            postUrl = post['link']
            raw_pingbacks = []
            if self.server_type == "wordpress":
                raw_pingbacks = self._server.pingback.extensions.getPingbacks(postUrl)
            pingbacks.extend([{'url_to':postUrl, 'url_from':raw_pingback} for raw_pingback in raw_pingbacks])
        return pingbacks

    @updater('trackbacks', event_type='trackback/wordpress')
    def updateTrackbacks(self):
        trackbacks = []
        for post in self.posts:
            postid = post['postid']
            raw_trackbacks = []
            if self.server_type == "wordpress":
                raw_trackbacks = self._server.mt.getTrackbackPings(postid)
            # !!! not sure yet if trackbacks always contain postid, may have to insert it
            trackbacks.extend(map(dict_to_json, raw_trackbacks))
        return trackbacks

    def update(self):
        logging.info("Updating...")

        self.updateUserInfo()
        self.updateBlogs()
        self.updateCategories()
        self.updatePosts()
        self.updateComments()
        self.updatePingbacks()
        self.updateTrackbacks()

        logging.info("Update finished")

def test_login():
    url = "lockertest.wordpress.com"
    username = "lockertest"
    password = "stopbreakingmyshit"
    return Client(None, url, username, password)

if __name__ == "__main__":
    client = test_login()
    for item in client.blogs + client.posts + client.categories + client.comments + client.pingbacks + client.trackbackPings:
        print item
