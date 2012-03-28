require 'json'
require 'mechanize'
require 'csv'

# STDIN.each_line do |line|
#    STDOUT.write line
#    STDOUT.flush
#    f.write line
# end


agent = Mechanize.new
agent.get('http://wakemate.com')
agent.page.link_with(:text => 'login').click
form = agent.page.form
form.username = ENV["WAKEMATE_EMAIL"]
form.password = ENV["WAKEMATE_PASSWORD"]
page = agent.submit(form, form.buttons.first)
page = page.link_with(:text => 'settings').click
page = agent.submit(page.forms.last, page.forms.last.button)
csv = page.body
array = CSV.parse(csv)
header = array[0]
results = array.drop(1)
sleep = results.collect{|res| Hash[[header, res].transpose] }


#sleep = [{:date => "2011-07-12T03:55:18Z", :sleepscore => 50}, { :date => "2011-07-13T03:55:18Z", :sleep_score => 80}]

STDOUT.write sleep.to_json