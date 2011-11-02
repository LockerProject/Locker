require 'rubygems'
require 'rspec'
require 'shoulda'
require 'capybara'
require 'capybara/dsl'
require 'capybara/rspec'

RSpec.configure do |config|
  config.include Capybara::DSL
  config.include Capybara::RSpecMatchers
end

Capybara.run_server = false
Capybara.app_host = "http://localhost:8043"

require 'selenium-webdriver'
Capybara.default_driver = :selenium
Capybara.ignore_hidden_elements = true


# the following enables you to use chrome because firefox suxxxx
# need to install : http://code.google.com/p/chromium/downloads/list for this to work properly
Capybara.register_driver :selenium do |app|
  Capybara::Selenium::Driver.new(app, :browser => :chrome, :switches => %w[--ignore-certificate-errors --disable-popup-blocking --disable-translate])
end

# Uncommon the next line and comment the 3 above to use firefox instead of chrome
#Selenium::WebDriver.for :firefox
