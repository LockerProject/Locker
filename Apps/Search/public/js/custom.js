$(function() {
	$("#searchButton").click(function() {
		$(this).closest("form").submit();
		return false;
	});
});