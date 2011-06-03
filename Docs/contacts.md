Common attributes of a contact

    {
        name:string,
        nickname:string,
        phoneNumbers:set({type:string, value:string}),
        emails:set({type:string, value:string}),
        ims:set({type:string, value:string}),
        addresses:set({type:string, value:string}),
        birthday:date,
        gender:string,
        groups:set(string),
        photos:set(string-urls),
        id:string
    }

