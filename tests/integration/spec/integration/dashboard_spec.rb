require File.join(File.expand_path(File.dirname(__FILE__)), '../spec_helper.rb')

#describe 'home page', :type => :request do
describe 'dashboard' do
  it 'allows people to see the connect page' do
    visit '/'
    within_frame 'appFrame' do
      page.should have_content("Nobody Selected")
    end
  end

  it 'should allow people to access the develop interface' do
    visit '/'
    click_link 'Develop'
    within_frame 'appFrame' do
      page.should have_content('Build an HTML5 web app')
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
