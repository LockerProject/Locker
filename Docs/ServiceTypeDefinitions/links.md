# Description

A link is a representation of an entity on the internet.

## Common Attributes

Common attributes that should be exposed by a link service-type implementation.

* **id** - *string* - System generated identifier for this entry
* **url** - *string-url* - The full url
* **sourceObjects** - *array of objects* -  A list of the objects that generated this url
    * **svcID** - *string* - The id of the service that it came from
    * **object** - *string* - The object that the link originated from

In a quasi JSON representation:

    {
        url:string-url,
        sourceObjects:set({svcID:string, object:object}),
    }


