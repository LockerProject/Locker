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

  it 'allows people to open the section to connect to services' do
    visit '/'
    page.execute_script("$('#services-box').click()")
    page.should have_content('Connect to')
  end

  it 'should allow access to api explorer' do
    visit '/'
    page.execute_script("$('#devdocs-box').click()")
    sleep 1
    within_frame 'appFrame' do
      page.should have_content('Make your own viewer!')
      click_on 'API Explorer'
      page.should have_content('API Explorer')
    end
  end

  it 'should allow access to create a new viewer' do
    visit '/'
    page.execute_script("$('#photos .buttonCounter').trigger('mouseenter')")
    sleep 1
    click_on 'Create a new view...'
    within_frame 'appFrame' do
      page.should have_content('Make your own viewer!')
    end
  end
end
