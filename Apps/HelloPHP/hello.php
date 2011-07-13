<?php

/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

// should core change the php search path to include Common/php? something, this hard-coded annoys the piss out of me, and I did it
require_once '../../Common/php/httpserver/httpserver.php';

// to quelch some obscure php strftime caLAMEity
date_default_timezone_set('America/Chicago');

$f = fopen('php://stdin', 'r');
$dat = fgets($f);
$init = json_decode($dat,true);
chdir($init['workingDirectory']);

class HelloServer extends HTTPServer
{
    function __construct($init)
    {
        parent::__construct(array(
            'port' => $init['port'],
        ));
    }

    function route_request($request)
    {
        $uri = $request->uri;
        $response = $this->response(200, "Hello <b>PHP</b>!");
        $response->headers['Content-Type'] = 'text/html';
        return $response; 
    }        

	// signals to core that we're ready for requests, oh happy day
	function listening()
	{
		print "{}\n";
	}
}

$server = new HelloServer($init);
$server->run_forever();

?>
