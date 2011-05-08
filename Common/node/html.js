/*
*
* Copyright (C) 2011, The Locker Project
* All rights reserved.
*
* Please see the LICENSE file for more information.
*
*/

/**
 * A function that allows to add special styles and formatting
 * to displayed data from Locker for each Connector. This is will be usually
 * used with `res.end()` functions and not `res.write()`. If it is required to use
 * `res.write()` or similar method, instead save to content you want in a variable
 * and pre-pend it to the content variable.
 * @param connector is the name of the connector using calling this function. This
 * variable will be in the title of the page, header, and meta tags.
 * @param content is the display message/notes/other you want.
 * @param colors is an array of color values of 4 elements:
 * [0]: color of the top bar
 * [1]: color of the text in the header
 * [2]: color of the background of the body content
 * [3]: color of the background of the rest of the page excluding the body content
 * 
 */

exports.formatHTML = function(connector, content, colors) {
    return "<!DOCTYPE html><html><head><meta charset='UTF-8'>"
        + "<meta name='description' content='Locker " + connector + " Connector' />"
        + "<title>" + connector + " Connector - Locker</title>"
        + "<style type='text/css'>"
        + "p{margin-left:1%;margin-right:1%;} body{background:" + colors[3] + ";} .topbar{background:" + colors[0] + ";width:100%;left:0;position:fixed;margin-top:-1.5%;height:6%;z-index:0;} .connector{width:30em;color:" + colors[1] + ";position:fixed;left:3%;top:0%;font-size:2em;z-index:1;} .goback{color:" + colors[1] + ";position:fixed;right:3%;top:1.5%;} .body{margin-top:4.5%;position:absolute;width:75%;margin-left:12.5%;border-bottom-right-radius:14px 14px;border-bottom-left-radius:14px 14px;border-right-width:2px;border-bottom-width:2px;border-left-width:2px;border-right-style:solid;border-bottom-style:solid;border-left-style:solid;border-right-color:" + colors[0] + ";border-bottom-color:" + colors[0] + ";border-left-color:" + colors[0] + ";background:" + colors[2] + ";z-index:-1;} .content{margin-left:1%;margin-right:1%;margin-top:2%;margin-bottom:2%} .copyright{margin-left:auto;margin-right:auto;width:30%;}"
        + "</style>"
        + "</head><body>"
        + "<div class='topbar'></div><div class='connector'><b>" + connector + " Connector</b></div><div class='goback'>"
        + "<a href='/' style='color:" + colors[1] + ";'>Go back</a></div><div class='body'><div class='content'>"
        + content + "</div>"
        + "<div class='copyright'>Copyright &copy; 2011, <a href='http://github.com/quartzjer/Locker'>The Locker Project</a></div></body></html>";
};