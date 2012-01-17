<?php

/*
 * CGIStream is a PHP stream wrapper (http://www.php.net/manual/en/class.streamwrapper.php)
 * that wraps the stdout pipe from a CGI process. It buffers the output until the CGI process is 
 * complete, and then rewrites some HTTP headers (Content-Length, Status, Server) and sets the HTTP status code
 * before returning the output stream from fread().
 *
 * This allows the server to be notified via stream_select() when the CGI output is ready, rather than waiting
 * until the CGI process completes.
 */
class CGIStream 
{
    public $context;
    
    const BUFFERING = 0;
    const BUFFERED = 1;
    const EOF = 2;
    
    private $cur_state = 0;
    
    private $buffer = '';       // buffered output from CGI process, as string
    private $buffer_stream;     // stream of CGI output after rewriting HTTP headers
    
    private $proc;              // handle to CGI process
    private $stream;            // output stream from CGI process
    private $server;            // the HTTPServer instance
    private $response;          // the HTTPResponse instance associated with this stream
    
    /*
     * Used by stream_select to determine when there is data ready on this stream.
     * We read the CGI response into a stream of type data:// so that stream_select
     * knows when we have more data for it.
     */
    function stream_cast($cast_as)
    {
        return ($this->cur_state == static::BUFFERING) ? $this->stream : $this->buffer_stream;
    }
    
    function stream_open($path, $mode, $options, &$opened_path)
    {
        $options = stream_context_get_options($this->context);
        
        $php_cgi = substr($path, 6); // assumes path starts with 'cgi://'
        
        $cgi_opts = $options['cgi'];
        
        $descriptorspec = array(
           0 => $cgi_opts['stdin'],
           1 => array('pipe', 'w'),
           2 => STDERR, 
        );
        
        $proc = proc_open($php_cgi, $descriptorspec, $pipes, 
            __DIR__, 
            $cgi_opts['env'],
            array(
                'binary_pipes' => true,
                'bypass_shell' => true
            )
        );
                
        if (!is_resource($proc))
        {
            return false;
        }                    

        $this->stream = $pipes[1];
        $this->proc = $proc;
        $this->server = $cgi_opts['server'];
        $this->response = $cgi_opts['response'];

        return true;
    }

    function stream_read($count)
    {
        switch ($this->cur_state)
        {
            case static::BUFFERING:
                $buffer =& $this->buffer;
                
                // sadly this blocks on Windows.
                // non-blocking pipes don't work in PHP on Windows, and stream_select doesn't know when the pipe has data
                $data = fread($this->stream, $count);
                
                if ($data !== false)
                {        
                    $buffer .= $data;
                    
                    // need to wait until CGI is finished to determine Content-Length
                    if (!feof($this->stream)) 
                    {
                        return '';
                    }
                }

                // now the CGI process has finished sending data.
                // CGI process sends HTTP status as regular header,
                // which we need to convert to HTTP status line.
                // also, need to add Content-Length header for HTTP keep-alive
                
                $end_response_headers = strpos($buffer, "\r\n\r\n");                
                if ($end_response_headers === false)
                {
                    $response = $this->server->text_response(502, "Invalid Response from CGI process");
                }
                else
                {                
                    $headers_str = substr($buffer, 0, $end_response_headers);        
                    $headers = HTTPServer::parse_headers($headers_str);        
                    
                    if (isset($headers['Status']))
                    {
                        $status_arr = explode(' ', $headers['Status'], 2);                    
                        $status = (int) $status_arr[0];
                        $status_msg = trim($status_arr[1]);
                        unset($headers['Status']);
                    }                
                    else
                    {
                        $status = 200;
                        $status_msg = null;
                    }

                    $content = substr($buffer, $end_response_headers + 4);                            
                    $response = $this->server->response($status, $content, $headers, $status_msg);
                }
                
                // set status and headers on the server's HTTPResponse object.
                // these aren't actually sent to the client,
                // but they could be referenced by HTTPServer::get_log_line                
                $this->response->status = $response->status;
                $this->response->status_msg = $response->status_msg;
                $this->response->headers = $response->headers;
                    
                $this->cur_state = static::BUFFERED;                
                
                $this->buffer_stream = fopen('data://text/plain,', 'r+b');
                
                fwrite($this->buffer_stream, $response->render());
                fseek($this->buffer_stream, 0);
                
                // intentional fallthrough 
            case static::BUFFERED:
                $res = fread($this->buffer_stream, $count);

                if (feof($this->buffer_stream))
                {
                    $this->cur_state = static::EOF;
                }                
                return $res;
            case static::EOF;
                return false;
        }                            
    }
    
    function stream_eof()
    {
        return $this->cur_state == static::EOF;
    }

    function stream_close()
    {
        proc_close($this->proc);        
        $this->proc = null;
        
        fclose($this->stream); 
        $this->stream = null;
        
        if ($this->buffer_stream)
        {
            fclose($this->buffer_stream);
            $this->buffer_stream = null;
        }
        $this->buffer = null;
        $this->server = null;        
        $this->response = null;
        
        $this->context = null;
    }
}
