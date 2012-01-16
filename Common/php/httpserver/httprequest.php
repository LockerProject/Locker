<?php
/*
 * Copyright (c) 2011, Trust for Conservation Innovation
 * Released under MIT license; see LICENSE.txt
 * http://github.com/youngj/httpserver
 */
class HTTPRequest
{
    public $method;             // HTTP method, e.g. "GET" or "POST"
    public $request_uri;        // original requested URI, with query string
    public $uri;                // path component of URI, without query string, after decoding %xx entities
    public $http_version;       // version from the request line, e.g. "HTTP/1.1"
    public $query_string;       // query string, like "a=b&c=d"
    public $headers;            // associative array of HTTP headers
    public $lc_headers;         // associative array of HTTP headers, with header names in lowercase
    public $content_stream;     // stream containing content of HTTP request (e.g. POST data)
    public $remote_addr;        // IP address of client, as string
    public $request_line;       // The HTTP request line exactly as it came from the client
    public $start_time;         // unix timestamp of initial request data, as float with microseconds
               
    // internal fields to track the state of reading the HTTP request
    private $cur_state = 0;
    private $header_buf = '';
    private $content_len = 0;
    private $content_len_read = 0;

    const READ_HEADERS = 0;
    const READ_CONTENT = 1;
    const READ_COMPLETE = 2;
        
    // fields used by HTTPServer to track other data along with the request
    public $socket;
    public $response;
    
    function __construct($socket)
    {
        $this->socket = $socket;        
        $this->content_stream = fopen("data://text/plain,", 'r+b');
        
        $remote_name = stream_socket_get_name($socket, true);
        if ($remote_name)
        {        
            $port_pos = strrpos($remote_name, ":");
            if ($port_pos)
            {
                $this->remote_addr = substr($remote_name, 0, $port_pos);
            }
            else
            {
                $this->remote_addr = $remote_name;
            }
        }
    }
                            
    function cleanup()
    {
        fclose($this->content_stream);
        $this->content_stream = null;
    }
                            
    /* 
     * Reads a chunk of a HTTP request from a client socket.
     */
    function add_data($data)
    {    
        switch ($this->cur_state)
        {
            case static::READ_HEADERS:
                if (!$this->start_time)
                {
                    $this->start_time = microtime(true);
                }
            
                $header_buf =& $this->header_buf;
            
                $header_buf .= $data;
                       
                $end_headers = strpos($header_buf, "\r\n\r\n", 4);
                if ($end_headers === false)
                {
                    break;
                }         

                // parse HTTP request line    
                $end_req = strpos($header_buf, "\r\n"); 
                $this->request_line = substr($header_buf, 0, $end_req);
                $req_arr = explode(' ', $this->request_line, 3);

                $this->method = $req_arr[0];
                $this->request_uri = $req_arr[1];
                $this->http_version = $req_arr[2];    
                
                $parsed_uri = parse_url($this->request_uri);        
                $this->uri = urldecode($parsed_uri['path']);
                $this->query_string = @$parsed_uri['query'];              
                
                // parse HTTP headers
                $start_headers = $end_req + 2;
                        
                $headers_str = substr($header_buf, $start_headers, $end_headers - $start_headers);
                $this->headers = HTTPServer::parse_headers($headers_str);
                
                $this->lc_headers = array();
                foreach ($this->headers as $k => $v)
                {
                    $this->lc_headers[strtolower($k)] = $v;
                }                

                $this->content_len = (int)@$this->lc_headers['content-length'];
                
                $start_content = $end_headers + 4; // $end_headers is before last \r\n\r\n
                
                // add leftover to content
                $content = substr($header_buf, $start_content);                
                fwrite($this->content_stream, $content);
                $this->content_len_read = strlen($content);
                $header_buf = '';                                
                break;
            case static::READ_CONTENT:
                fwrite($this->content_stream, $data);
                $this->content_len_read += strlen($data);
                break;
            case static::READ_COMPLETE:
                break;
        }    
        
        if (!$this->headers)
        {
            $this->cur_state = static::READ_HEADERS;
        }
        else if ($this->needs_content())
        {
            $this->cur_state = static::READ_CONTENT;
        }
        else
        {
            fseek($this->content_stream, 0);
            $this->cur_state = static::READ_COMPLETE;
        }
    }
    
    /* 
     * Returns the value of a HTTP header from this request (case-insensitive)
     */
    function get_header($name)
    {
        return @$this->lc_headers[strtolower($name)];
    }
    
    /*
     * Returns true if a full HTTP request has been read by add_data().
     */
    function is_read_complete()
    {
        return $this->cur_state == static::READ_COMPLETE;
    }    
    
    /*
     * Sets a HTTPResponse object associated with this request
     */ 
    function set_response($response)
    {
        $this->response = $response;
    }    

    /*
     * Returns true if more content still needs to be read from the client socket.
     * Only valid after the headers have been read.
     */
    protected function needs_content()
    {
        return $this->content_len - $this->content_len_read > 0;
    }                
}