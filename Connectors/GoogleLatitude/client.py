import sys
import logging
import httplib2

import apiclient.discovery

sys.path.append("../../Common/python")
import lockerfs

def updater(name, default=[]):
    def transform(fun):
        def update(self):
            logging.info("Updating %s" % name)
            old_value = (
                    self.__dict__.get(name, None) or
                    lockerfs.loadJsonFile(name + ".json") or
                    default
                    )
            new_value = fun(self)
            self.__dict__[name] = new_value
            lockerfs.saveJsonFile(name + ".json", new_value)
        return update
    return transform

class Client(object):
    def __init__(self, core_info, credentials):
        self.core_info = core_info
        self.me_info = lockerfs.loadJsonFile("me.json")

        http = credentials.authorize(httplib2.Http())
        self._service = apiclient.discovery.build("latitude", "v1", http=http)

        self.locations = lockerfs.loadJsonFile("locations.json")
        #self.update_state = lockerfs.loadJsonFile("updateState.json")
        #self.update_state.setdefault('locations', {}).setdefault('syncedThrough', 0)

    @updater('locations', default=[])
    def updateLocations(self):
        locations = self._service.location().list(
                #min_time=self.update_state['locations']['syncedThrough'],
                max_results=1000,
                granularity='best'
                ).execute()['items']
        #self.update_state['locations']['synchedThrough'] = max(locations,
        #        key=lambda location: location['timestampMs'])
        #lockerfs.saveJsonFile("updateState.json", self.update_state)
        return locations

    def update(self):
        logging.info("Updating...")

        self.updateLocations()

        logging.info("Update finished")

