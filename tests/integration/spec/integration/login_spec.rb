require File.join(File.expand_path(File.dirname(__FILE__)), '../spec_helper.rb')

#describe 'home page', :type => :request do
describe 'dashboard' do
  it 'allows people to switch between 3 views' do
    visit '/'
    page.should have_css('#contacts.selected')
    within_frame 'appFrame' do
      page.should have_content('Jeremie')
    end
    page.execute_script("$('#photos').click()")
    page.should have_css('#photos.selected')
    within_frame 'appFrame' do
      page.should have_content('Photos')
    end
    page.execute_script("$('#links').click()")
    page.should have_css('#links.selected')
    within_frame 'appFrame' do
      page.should have_content('Links')
    end
  end
end
