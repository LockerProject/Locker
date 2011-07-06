# Description

A contact is a representation of another entity, most commonly another person.  The information can be varied, but 
the core is focussed on the types of entries that would be found in an address book.

## Common Attributes

Common attributes that should be exposed by a contact service-type implementation.

* **id** - *string* - System generated identifier for this entry
* **name** - *string* - The full name, including first, middle, last, etc.
* **nickname** - *array of strings* - Any nicknames or handles that are used, such as remote service usernames.
* **email** - *array of email entries* - Every available email address
    * **type** - *string* - A general type for this email address such as work, home, other
    * **value** - *string* - The actual complete email address
* **im** - *array of IM entries* - Every available instant messaging method
    * **type** - *string* - The service that the contact exists on such as aim, yahoo, msn, skype, xmpp
    * **value** - *string* - The actual address on the remote IM network
* **address** - *array of address entries* - Every available physical address
    * **type** - *string* - A general type for this physical address such as work, home, other
    * **value** - *string* - The complete address, in American terms this would include street address, city, state and zip, but is agnostic to locale.
* **birthday** - *date* - A string date of the birthday, for example "10/6/1980"
* **groups** - *array of strings* - An abstract array of the names of different groups that the person belongs to.  This field may evolve later.
* **photo** - *array of strings* - Each entry is a URL to a photo of the person.  This should include system avatars and other representations like that.
* **accounts** - *object* - Each specific service-type that has been merged into this contact has an entry here.  The key is the specific service-type subkey, for example twitter.  That key leads to an array of all the individual instances of that type that were merged.  There is usually one instance here per Connector of that type.  The data is the complete and unchanged object from the connector and the specific service-type document should be referenced for details.

In a quasi JSON representation:

    {
        name:string,
        nickname:array(string),
        phone:array({type:string, value:string}),
        email:array({type:string, value:string}),
        im:array({type:string, value:string}),
        address:array({type:string, value:string}),
        birthday:date,
        groups:array(string),
        photo:array(string-urls),
        id:string,
        accounts:{serviceName:[{...full object...}]}
    }


## API

Other than the core query API these are the API methods that a contacts service type implementation should expose.

---

### getPhoto

Retrieve the actual binary data for a given contact photo.

#### Method
GET

#### Path
/getPhoto

#### Arguments

* **index** - *optional* - A zero based index into the contacts photo array for which photo to retrieve.  If left off it defaults to the first entry in the array.

#### Returned Data

Binary data of the image at the url.

#### Example

    /getPhoto?index=1

Returns the image data of the second entry in the array

    /getPhoto

Returns the image data of the first entry in the array
