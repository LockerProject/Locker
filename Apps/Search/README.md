To use the elasticsearch back-end, you'll need to download elasticsearch 0-16.2
or greater, and start it via ./bin/elasticsearch.  This search app will look
for elasticsearch running on localhost:9200.

It's probably also a good idea to change elasticsearch's configuration to store
the data indices of your Locker inside your ./Me/search directory.
Instructions on how to do that can be found below:

http://www.elasticsearch.org/guide/reference/setup/configuration.html