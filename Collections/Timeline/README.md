The "feeds" collection is all of the socially shared items across any service, facebook newsfeed, twitter timeline, foursquare recents, etc.

It consists of a primary type called an "item" which can have an array of "responses" that are comments, likes, retweets, etc from other people.

The goal is to dedup cross-posts to multiple networks from one person, particularly things like a foursquare checkin.


Notes:

  id references and keys
  cross-collection reference storage with links
  link based dedup of foursquare
  dedup uses keys as guids across networks and for text matching variations
  /update takes type arg for individual updates
  idrs as via, no original storage
  prioritization scheme in merging items
  generic from object, list of froms
  references array of all sources
  generalized responses and top-level statistics
