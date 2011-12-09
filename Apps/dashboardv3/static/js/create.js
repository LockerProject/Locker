$(document).ready(function() {
  $('.viewAll').click(function() {
    $(this).toggleClass('expanded').toggleClass('blue').parent('p').siblings().toggle();
  });
});
