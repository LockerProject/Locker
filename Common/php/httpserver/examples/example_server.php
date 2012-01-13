<?php

/*
 * Example standalone HTTP server that routes all .php URIs to PHP files under ./example_www, 
 * and routes all other URIs to static files under ./example_www. 
 * 
 * index.php is used as the directory index.
 *
 * Just run it on the command line like "php example_server.php".
 */

require_once dirname(__DIR__) . '/httpserver.php';

class ExampleServer extends HTTPServer
{
    function __construct()
    {
        parent::__construct(array(
            'port' => 8002,
        ));
    }

    function route_request($request)
    {
        $uri = $request->uri;
        
        $doc_root = __DIR__ . '/example_www';
        
        if (preg_match('#/$#', $uri))
        {
            $uri .= "index.php";
        }
        
        if (preg_match('#\.php$#', $uri))
        {
            return $this->get_php_response($request, "$doc_root$uri");
        }
        else
        {
            return $this->get_static_response($request, "$doc_root$uri");
        }                
    }        
}

$server = new ExampleServer();
$server->run_forever();