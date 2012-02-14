require File.join(File.expand_path(File.dirname(__FILE__)), '../spec_helper.rb')

#describe 'home page', :type => :request do
describe 'dashboard' do
  it 'allows people to see the EXPLORE page' do
    visit '/'
    page.should have_content("Contacts (DEMO)by Singly, Inc. with contacts from { see the code }")
  end

  it 'should allow people to access the DEVELOP page' do
    visit '/'
    click_link 'Develop'
    within_frame 'appFrame' do
      page.should have_content('Build an HTML5 web app')
    end
    within_frame 'appFrame' do
      click_link 'API Explorer'
      page.should have_content('API Explorer')
    end
  end

  it "should allow account holders to change their settings" do
    visit '/'
    click_link 'Account Settings'
    page.should have_content('ACCOUNT SETTINGS')
  end

  it "should default to connecting to services (by default)" do
    visit '/'
    click_link 'Account Settings'
    page.should have_content('ACCOUNT SETTINGS')
    page.should have_css('.iframeLink.blue[data-id="Settings-Connections"]')
  end
end
