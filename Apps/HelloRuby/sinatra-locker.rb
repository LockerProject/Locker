require 'sinatra/base'
require 'json'

module Sinatra
  class Application < Base

    # we assume that the first file that requires 'sinatra' is the
    # app_file. all other path related options are calculated based
    # on this path by default.
    set :app_file, $0

    set :run, Proc.new { $0 == app_file }

    $stdin.set_encoding("UTF-8")
    
    json_str = ""
    json = nil

    until json do
      begin
        $stdin.read_nonblock(4096, json_str)
      rescue Errno::EWOULDBLOCK, Errno::EAGAIN, Errno::EINTR
        IO.select([$stdin])
        retry
      end
      begin
        json = JSON::parse(json_str)
      rescue
      end
    end
    
    cwd  = json["workingDirectory"]
    host = json["host"] || "127.0.0.1"
    Dir.chdir(cwd) if cwd
    set :port, json["port"]
    set :host, host
  end

  at_exit {
    if ($!.nil? && Application.run?)
      Application.run! do |handler, options|
        $stdout.puts "{}"
        $stdout.flush
      end
    end
  }
end

include Sinatra::Delegator
enable :inline_templates
