Common attributes of a contact

    {
        name:string,
        nickname:string,
        phone:set({type:string, value:string}),
        email:set({type:string, value:string}),
        im:set({type:string, value:string}),
        address:set({type:string, value:string}),
        birthday:date,
        gender:string,
        groups:set(string),
        photo:set(string-urls),
        id:string
    }

