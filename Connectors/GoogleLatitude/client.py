import sys
import logging
import httplib2

import apiclient.discovery
import apiclient.errors

sys.path.append("../../Common/python")
import lockerfs

class Client(object):
    def __init__(self, core_info, credentials):
        self.core_info = core_info
        self.me_info = lockerfs.loadJsonFile("me.json")

        http = credentials.authorize(httplib2.Http())
        self._service = apiclient.discovery.build("latitude", "v1", http=http)

        self.locations = lockerfs.loadJsonFile("locations.json")
        self.update_state = lockerfs.loadJsonFile("updateState.json")
        self.update_state.setdefault('locations', {}).setdefault('syncedThrough', None)

    def _fetchLocationBatch(self, min_time=None, max_time=None):
        args = { 'max_results' : 1000, 'granularity' : 'best' }
        if min_time is not None:
            args['min_time'] = min_time
        if max_time is not None:
            args['max_time'] = max_time
        try:
            locations = self._service.location().list(**args).execute()
        except apiclient.errors.HttpError as e:
            logging.info("HTTP Error while fetching locations: %s" % (e,))
            return (None, None)
        if 'items' not in locations or len(locations['items']) == 0:
            logging.info("Fetched 0 locations")
            return (None, None)

        locations = locations['items']
        min_time = min(int(location['timestampMs']) for location in locations)
        max_time = max(int(location['timestampMs']) for location in locations)
        logging.info("Fetched %d locations with timestamps %d - %d" % (
            len(locations), min_time, max_time))

        self.locations.update((l['timestampMs'], l) for l in locations)
        return (min_time, max_time)

    def updateLocations(self):
        logging.info("Updating locations")

        if self.update_state['locations']['syncedThrough'] is None:
            # special case for the initial fetch to backfill old entries
            min_time, max_time = self._fetchLocationBatch()
            if min_time is None:
                logging.info("No locations found on first fetch, maybe history is disabled?")
                return
            self.update_state['locations']['syncedThrough'] = max_time
            while min_time is not None:
                min_time, max_time = self._fetchLocationBatch(
                        min_time-(1000*60*60*24*30),
                        min_time-1
                        )

        min_time, max_time = self._fetchLocationBatch(
                self.update_state['locations']['syncedThrough']+1,
                self.update_state['locations']['syncedThrough']+(1000*60*60*24*30))
        while max_time is not None:
            self.update_state['locations']['syncedThrough'] = max_time
            min_time, max_time = self._fetchLocationBatch(
                self.update_state['locations']['syncedThrough']+1,
                self.update_state['locations']['syncedThrough']+(1000*60*60*24*30))

        lockerfs.saveJsonFile("locations.json", self.locations)
        lockerfs.saveJsonFile("updateState.json", self.update_state)

    def update(self):
        logging.info("Updating...")

        self.updateLocations()

        logging.info("Update finished")

