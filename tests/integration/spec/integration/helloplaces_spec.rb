require File.join(File.expand_path(File.dirname(__FILE__)), '../spec_helper.rb')

#describe 'home page', :type => :request do

describe 'helloplaces' do
 it 'allows people to view all scrolled locations' do
   visit '/dashboard/#places'
      sleep 1000000
   page.should have_css('#places.selected')
     within_frame 'appFrame' do
     page.should have_css('#placeslist')
     page.execute_script("$('.placelink:first-of-type').click()")
     page.should have_css('#mapcanvas img')
   end
 end
end