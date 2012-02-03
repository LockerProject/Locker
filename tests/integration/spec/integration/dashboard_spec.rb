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
    click_link 'DEVELOP'
    page.should have_content('Getting Started')
  end

  it 'should allow access to api explorer' do
    visit '/'
    click_link 'DEVELOP'
    click_link 'Getting Started'
    within_frame 'appFrame' do
      page.should have_content('Make your own viewer!')
      click_on 'API Explorer'
      page.should have_content('API Explorer')
    end
  end

end
