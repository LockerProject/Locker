require File.join(File.expand_path(File.dirname(__FILE__)), '../spec_helper.rb')

#describe 'home page', :type => :request do
describe 'dashboard' do
  it 'allows people to switch between 4 views' do
    visit '/'
    page.should have_css('.iframeLink.orange[data-id="contactsviewer"]')
    within_frame 'appFrame' do
      page.should have_content('Jeremie')
    end
    page.execute_script("$('.iframeLink[data-id=\"photosv09\"]').click()")
    page.should have_css('.iframeLink.orange[data-id="photosv09"]')
    within_frame 'appFrame' do
      page.should have_content('Photos')
    end
    page.execute_script("$('.iframeLink[data-id=\"linkalatte\"]').click()")
    page.should have_css('.iframeLink.orange[data-id="linkalatte"]')
    within_frame 'appFrame' do
      page.should have_content('Links')
    end
    page.execute_script("$('.iframeLink[data-id=\"helloplaces\"]').click()")
    page.should have_css('.iframeLink.orange[data-id="helloplaces"]')
    within_frame 'appFrame' do
      page.should have_content('Places')
    end
  end

  it 'should allow access to api explorer' do
    visit '/'
    sleep 1
    page.execute_script("$('.iframeLink[data-id=\"devdocs\"]').click()")
    within_frame 'appFrame' do
      page.should have_content('Make your own viewer!')
      click_on 'API Explorer'
      page.should have_content('API Explorer')
    end
  end

end
