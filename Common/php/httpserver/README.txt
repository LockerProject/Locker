HTTPServer
http://github.com/youngj/httpserver

A simple HTTP server, 
    written in PHP, 
    that serves PHP scripts and static files,
    for use in developing PHP applications.

Motivation:
 * To allow running PHP scripts in a web browser on a development computer 
   without needing to install a web server like Apache or Nginx. 
 * To allow automated scripts (e.g. Selenium tests) to spawn a HTTP server with 
   custom environment variables (e.g. to override some application config settings),
   and easily capture server log output.
 * To allow more rapid debugging, by printing stderr output (e.g. error_log()) 
   directly to the console instead of a server log file.

Dependencies:
    * PHP 5.3 or higher
    * php-cgi binary 

Features:
    * Works on Windows as well as POSIX systems.
    * Can handle many concurrent connections using non-blocking sockets.
    * Implements HTTP Keep-Alive for better performance.
    * Clients can define basically any server configuration / rewrite rules
      just by creating a subclass of HTTPServer.
    * Nearly all PHP scripts should work without modification. (Each PHP 
      request is run in an isolated environment using PHP-CGI.)
    * Does not require any PHP extensions.
    
Caveats:
    * Should NOT be used as a production web server open to untrusted traffic.
    * Not very robust (e.g. no connection limit or timeouts)
    * May have security flaws
    * On Windows, PHP requests will block the server until the php-cgi process 
      completes (PHP on Windows cannot share sockets across multiple processes,
      and does not have non-blocking pipes).
    * PHP scripts that depend on server-specific extensions (e.g. functions like 
      apache_*, iis_*, nsapi_*) will not work.
    
How to use:
    Clients should subclass HTTPServer and override the route_request() method
    (and possibly other methods as necessary).    

    See examples/example_server.php. 
    
License:
    See LICENSE.txt
