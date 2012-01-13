<?php

/*
 * Copyright (c) 2011, Trust for Conservation Innovation
 * Released under MIT license; see LICENSE.txt
 * http://github.com/youngj/httpserver
 */
 
class HTTPResponse
{
    public $status;                 // HTTP status code
    public $status_msg;             // HTTP status message
    public $headers;                // associative array of HTTP headers 
    
    public $content = '';           // response body, as string (optional)    
    public $stream = null;          // response body (or headers+body if prepend_headers is false) as stream
    
    public $prepend_headers = true; // true if the HTTP status/headers should be added to the response
                                    // false if the HTTP status/headers are sent in $stream
    
    public $buffer = '';            // buffer of HTTP response waiting to be written to client socket
    public $bytes_written = 0;      // count of bytes written to client socket

    function __construct($status = 200, $content = '', $headers = null, $status_msg = null)
    {
        $this->status = $status;
        $this->status_msg = $status_msg;

        if (is_resource($content))
        {
            $this->stream = $content;
        }
        else        
        {
            $this->content = $content;
        }
        $this->headers = $headers ?: array();
    }        
   
    function eof()
    {
        return !strlen($this->buffer) && $this->stream_eof();
    }
    
    function stream_eof()
    {
        return !$this->stream || feof($this->stream);
    }    
        
    static function render_status($status, $status_msg = null)
    {
        // Per RFC2616 6.1.1 we pass on a status message from the provider if
        // provided, otherwise we use the standard message for that code.
        if (empty($status_msg)) 
        {
            $status_msg = static::$status_messages[$status];
        }
        return "HTTP/1.1 $status $status_msg\r\n";
    }
    
    static function render_headers($headers)
    {
        ob_start();        
        foreach ($headers as $name => $value)
        {
            echo "$name: $value\r\n";
        }
        echo "\r\n";        
        return ob_get_clean();
    }
            
    function render()
    {
        $headers =& $this->headers;

        if (!isset($headers['Content-Length']))
        {
            $headers['Content-Length'] = $this->get_content_length();
        }        
        
        return  static::render_status($this->status, $this->status_msg).
                static::render_headers($headers).
                $this->content;
    }
    
    function get_content_length()
    {
        // only valid if content is supplied as a string
        return strlen($this->content);
    }    
    
    static $status_messages = array(
        100 => "Continue",
        101 => "Switching Protocols",
        200 => "OK",
        201 => "Created",
        202 => "Accepted",
        203 => "Non-Authoritative Information",
        204 => "No Content",
        205 => "Reset Content",
        206 => "Partial Content",
        300 => "Multiple Choices",
        301 => "Moved Permanently",
        302 => "Found",
        303 => "See Other",
        304 => "Not Modified",
        305 => "Use Proxy",
        307 => "Temporary Redirect",
        400 => "Bad Request",
        401 => "Unauthorized",
        402 => "Payment Required",
        403 => "Forbidden",
        404 => "Not Found",
        405 => "Method Not Allowed",
        406 => "Not Acceptable",
        407 => "Proxy Authentication Required",
        408 => "Request Timeout",
        409 => "Conflict",
        410 => "Gone",
        411 => "Length Required",
        412 => "Precondition Failed",
        413 => "Request Entity Too Large",
        414 => "Request-URI Too Long",
        415 => "Unsupported Media Type",
        416 => "Requested Range Not Satisfiable",
        417 => "Expectation Failed",
        500 => "Internal Server Error",
        501 => "Not Implemented",
        502 => "Bad Gateway",
        503 => "Service Unavailable",
        504 => "Gateway Timeout",
        505 => "HTTP Version Not Supported",
    );
}
