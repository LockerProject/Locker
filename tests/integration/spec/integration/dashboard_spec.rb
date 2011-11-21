require File.join(File.expand_path(File.dirname(__FILE__)), '../spec_helper.rb')

#describe 'home page', :type => :request do
describe 'dashboard' do
  it 'allows people to switch between 4 views' do
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
    page.execute_script("$('#places').click()")
    page.should have_css('#places.selected')
    within_frame 'appFrame' do
      page.should have_content('Places')
    end
  end

  it 'allows people to open the section to connect to services' do
    visit '/'
    page.execute_script("$('#services-box').click()")
    page.should have_content('Connect to')
  end

  it 'should allow access to api explorer' do
    visit '/'
    sleep 1
    page.execute_script("$('.devdocs-box').click()")
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

  it 'should show a Gritter notification if a new service is connected' do
    visit '/'
    page.execute_script("socket.$events.newservice({provider:'gcontacts', title:'Google Contacts'})")
    page.execute_script("$(window).trigger('focus')")
    page.should have_content('Connected Google Contacts')
  end

  it 'a Gritter notification should show a close button when hovered over' do
    visit '/'
    page.execute_script("socket.$events.newservice({provider:'gcontacts', title:'Google Contacts'})")
    page.execute_script("$(window).trigger('focus')")
    sleep 0.1
    page.execute_script("$('.gritter-item').trigger('mouseover')")
    page.should have_css('.gritter-close')
  end

  it 'should show a Gritter notification should show a close button when hovering over it' do
    visit '/'
    page.execute_script("$(window).trigger('focus');")
    page.execute_script(<<"BLORF")
    socket.$events.viewer({
       type:'view/github',
       via:'github',
       timestamp:1320881456139,
       action:'update',
       obj:{
          source:'github_view',
          data:{
             id:'smurthas/Skeleton-Viewer',
             manifest:'smurthas/Skeleton-Viewer/manifest.app',
             at:'2011/11/09 15:23:33 -0800',
             viewer:'photos',
             _id:'4ebb0ce297e5172111034f6b'
          }
       }
    });
BLORF
    sleep 0.1
    page.should have_content('Updated Photos Viewer')
    page.should have_content('smurthas/Skeleton-Viewer')
  end
end
