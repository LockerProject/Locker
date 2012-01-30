require File.join(File.expand_path(File.dirname(__FILE__)), '../spec_helper.rb')

#describe 'home page', :type => :request do
describe 'dashboard' do
  it 'allows people to switch between 4 views' do
    visit '/'
    page.should have_css('.iframeLink[data-id="You-contactsviewer"]')
    page.execute_script("$('.iframeLink[data-id=\"You-contactsviewer\"]').click()")
    within_frame 'appFrame' do
      page.should have_content('Jeremie')
    end
    page.execute_script("$('.iframeLink[data-id=\"You-photosv09\"]').click()")
    page.should have_css('.iframeLink.blue[data-id="You-photosv09"]')
    within_frame 'appFrame' do
      page.should have_content('Photos')
    end
    page.execute_script("$('.iframeLink[data-id=\"You-linkalatte\"]').click()")
    page.should have_css('.iframeLink.blue[data-id="You-linkalatte"]')
    within_frame 'appFrame' do
      page.should have_content('Links')
    end
    page.execute_script("$('.iframeLink[data-id=\"You-helloplaces\"]').click()")
    page.should have_css('.iframeLink.blue[data-id="You-helloplaces"]')
    within_frame 'appFrame' do
      page.should have_content('Places')
    end
  end

  it 'should allow people to access the create interface' do
    visit '/'
    click_link 'CREATE'
    page.should have_content('Getting Started')
  end

  it 'should allow access to api explorer' do
    visit '/'
    click_link 'CREATE'
    click_link 'Getting Started'
    within_frame 'appFrame' do
      page.should have_content('Make your own viewer!')
      click_on 'API Explorer'
      page.should have_content('API Explorer')
    end
  end

end
