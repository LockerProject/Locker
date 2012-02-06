# Formatting a package.json for apps

All apps need to have a package.json file to describe themselves, this is based on the [CommonJS Packages](http://wiki.commonjs.org/wiki/Packages) format and [NPM](http://npmjs.org/doc/json.html), as well as some additional fields needed to describe the app.

## Minimum template to start

    {
        "version": "0.0.1",
        "repository": {
            "title": "My App",
            "type": "app",
            "description": "This is my awesome app!",
            "static": "true"
        }
    }

## Screenshot

The default screenshot used to describe the app is simply the screenshot.png file included with it.  The preferred size is 360x360, and it should represent what the app looks like in use (not an icon or cover).

## Optional repository fields

