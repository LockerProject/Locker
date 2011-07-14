# Example Ruby Sinatra App #

This code uses [Sinatra](http://www.sinatrarb.com) to display a very simple web
page within the Locker UI. Mostly, this is a demonstration of how to put the
ruby process lifetime at the mercy of the lockerd service loader, and how to
launch sinatra based on the launch requirements of lockerd.

There is a slight change to sinatra neccessary to have it return the data neededon successful launch; because of this the project currently uses [Bundler](http://gembundler.com/) to point at [Sinatra HEAD](https://github.com/sinatra/sinatra) on [GitHub](https://github.com). Sinatra 1.3.0 should include the neccessary changes.

If you are unfamiliar with Bundler, simply:

    $ gem install bundler
    $ cd <path/to/HelloRuby>
    $ bundle install
