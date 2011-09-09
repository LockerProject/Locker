import apiclient.discovery
import apiclient.errors
from datetime import datetime
import httplib2
import oauth2client.client
import sys
import logging

sys.path.append("../../Common/python")
import lockerfs

def sync(process_info):
    update_state = process_info.get('config', {}).get('updateState', {})
    update_state.setdefault('locations', {}).setdefault('syncedThrough', None)

    auth = process_info['auth']
    credentials = oauth2client.client.OAuth2Credentials(
            auth['token']['access_token'],
            auth['appKey'],
            auth['appSecret'],
            auth['token'].get('refresh_token', None),
            None,
            'https://accounts.google.com/o/oauth2/token',
            'locker-synclet-latitude/0.1')
    api_service = apiclient.discovery.build("latitude", "v1",
            http=credentials.authorize(httplib2.Http()))

    update_state, locations = sync_locations(api_service, update_state)
    auth['token']['access_token'] = credentials.access_token
    auth['token']['refresh_token'] = credentials.refresh_token
    return_info = {
            'auth' : auth,
            'config' : { 'updateState' : update_state, },
            'data' : {
                'locations' : [ dress_up_location(l) for l in locations ],
            },
    }
    return return_info

def sync_locations(api_service, update_state):
    logging.info("Updating locations")
    locations = []

    if update_state['locations']['syncedThrough'] is None:
        # special case for the initial fetch to backfill old entries.
        # it seems that the latitude api doesn't allow starting with min_time=0
        # so instead we start from the current results and keep reducing
        # min_time until no more records are returned.
        min_time, max_time, loc_batch = _fetch_location_batch(api_service)
        if min_time is None:
            logging.info("No locations found on first fetch, maybe history is disabled?")
            return update_state, locations
        update_state['locations']['syncedThrough'] = max_time
        while min_time is not None:
            locations.extend(loc_batch)
            min_time, max_time, loc_batch = _fetch_location_batch(
                    api_service,
                    min_time-(1000*60*60*24*30),
                    min_time-1
                    )

    min_time, max_time, loc_batch = _fetch_location_batch(
            api_service,
            update_state['locations']['syncedThrough']+1,
            update_state['locations']['syncedThrough']+(1000*60*60*24*30))
    while max_time is not None:
        update_state['locations']['syncedThrough'] = max_time
        locations.extend(loc_batch)
        min_time, max_time, loc_batch = _fetch_location_batch(
                api_service,
                update_state['locations']['syncedThrough']+1,
                update_state['locations']['syncedThrough']+(1000*60*60*24*30))

    return update_state, locations

def _fetch_location_batch(api_service, min_time=None, max_time=None):
    args = { 'max_results' : 1000, 'granularity' : 'best' }
    if min_time is not None:
        args['min_time'] = min_time
    if max_time is not None:
        args['max_time'] = max_time
    try:
        locations = api_service.location().list(**args).execute()
    except apiclient.errors.HttpError as e:
        logging.warn("HTTP Error while fetching locations: %s" % (e,))
        return (None, None, [])
    if 'items' not in locations or len(locations['items']) == 0:
        logging.info("Fetched 0 locations")
        return (None, None, [])

    locations = locations['items']
    min_time = min(int(location['timestampMs']) for location in locations)
    max_time = max(int(location['timestampMs']) for location in locations)
    logging.info("Fetched %d locations with timestamps %d - %d" % (
        len(locations), min_time, max_time))

    return (min_time, max_time, locations)

def dress_up_location(location):
    try:
        # convert the timestamp into javascript's Date.toJSON() format (i.e.
        # same as ISO8601)
        timestamp = datetime.utcfromtimestamp(
                int(location['timestampMs']) / 1000.0).isoformat() + "Z"
    except ValueError, e:
        logging.debug("location had unparseable timestamp [%s]: %s",
                (location['timestampMs'], e))
        return None

    return { 'obj': location, 'type': 'new', 'timestamp': timestamp, }

