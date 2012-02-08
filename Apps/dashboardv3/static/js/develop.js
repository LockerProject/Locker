$(function() {
    $("#develop-nav-column div").removeClass('selected');
    switch (window.parent.location.hash) {
        case '#Develop-BuildAnApp':
            $("#develop-nav-buildanapp").addClass('navitem-selected');
            break;
        case '#Develop-ApiExplorer':
            $("#develop-nav-apiexplorer").addClass('navitem-selected');
            break;
        case '#Develop-Publishing':
            $("#develop-nav-publishing").addClass('navitem-selected');
            break;
        case '#Develop-ExampleApps':
            $("#develop-nav-exampleapps").addClass('navitem-selected');
            break;
        case '#Develop-ChatWithTheTeam':
            $("#develop-nav-chatwiththeteam").addClass('navitem-selected');
            break;
        case '#Develop-TemplatesIcons':
            $("#develop-nav-templatesicons").addClass('navitem-selected');
            break;
        default:   
    }
});