# Editing a package.json for apps

All apps need to have a package.json file to describe themselves with a few required fields. This is based on the [CommonJS Packages](http://wiki.commonjs.org/wiki/Packages) format and [NPM](http://npmjs.org/doc/json.html), with the additional data needed in the repository field.

## Minimum template to start

    {
        "name": "myapp",
        "version": "0.0.0",
        "description": "This is my awesome app!",
        "repository": {
            "title": "My App"
        }
    }

The `name` field is a short name or 'handle', required but not visible anywhere.

The `version` is good to start with `0.0.0` and only increment the first two (x.x.0) if you want to track your own versions here, the last one (0.0.y) is auto-incremented every time an app is published.

Set `description` to a sentence describing what the app does in the gallery or details page before someone installs it.

For `repository.title` choose a short recognizable title (show in the list of apps after it's added).

## Screenshot

The default screenshot used to describe the app is simply the `screenshot.png` file included with it.  The preferred size is 360x360, and it should represent what the app looks like in use (not an icon or cover).

## Optional repository fields

To better describe what data an app needs in order to be useful, the uses field can express those requirements ahead of time:

    {
        "name": "myapp",
        "version": "0.0.0",
        "description": "This is my awesome app!",
        "repository": {
            "title": "My App",
            "uses": {
                "services": [ "twitter", "foursquare", "instagram" ],
                "types": [ "places" ]
            }
        },
        "author": "My Name <my@email>"
    }

Add any helpful or required services to the `repository.uses.services` array.

If any collections are used, add them to the `repository.uses.types` array.

By default the `author` is set to your github information when you publish, but you can override it here too.

## Problems/Questions?

Just ask!  Check out the IRC for a quick answer or post to our forum or mailing list for anything bigger, thanks!

