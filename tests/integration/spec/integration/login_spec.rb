require 'spec/spec_helper.rb'

#describe 'home page', :type => :request do
describe 'dashboard' do
  it 'allows people to switch between 3 views' do
    visit '/'
    page.should have_css('#contacts.selected')
    within_frame 'appFrame' do
      page.should have_content('Jeremie')
    end
  end
end
