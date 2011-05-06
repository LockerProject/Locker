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
 * to displayed data from Locker for each Connector
 */

exports.formatHTML = function(connector, content, colors) {
    return "<!DOCTYPE html><html><head><meta charset='UTF-8'>"
        + "<meta name='description' content='Locker " + connector + " Connector' />"
        + "<title>" + connector + " Connector - Locker</title>"
        + "<style type='text/css'>"
        + ".topbar{background:" + colors[0] + ";width:100%;left:0;position:absolute;margin-top:-1.5%;height:6%;} .connector{width:90%;color:" + colors[1] + ";position:absolute;left:3%;top:-1%;} .goback{color:" + colors[1] + ";position:absolute;right:3%;top:1.5%;} .body{margin-top:4%;position:absolute;width:75%;height:88%;margin-left:12.5%;border-bottom-right-radius:14px 14px;border-bottom-left-radius:14px 14px;border-right-width:2px;border-bottom-width:2px;border-left-width:2px;border-right-style:solid;border-bottom-style:solid;border-left-style:solid;border-right-color:" + colors[0] + ";border-bottom-color:" + colors[0] + ";border-left-color:" + colors[0] + ";} .content{margin-left:1%;margin-top:2%} /*h3{margin-left:1%;margin-bottom:0.5%;}*/ .copyright{margin-top:63%;margin-left:auto;margin-right:auto;width:30%;}"
        + "</style>"
        + "</head><body>"
        + "<div class='topbar'></div><div class='connector'><h3>" + connector + " Connector</h3></div><div class='goback'>"
        + "<a href='/' style='color:" + colors[1] + ";'>Go back</a></div><div class='body'><div class='content'>"
        + content + "</div>"
        + "<div class='copyright'>Copyright &copy; 2011, <a href='http://github.com/quartzjer/Locker'>The Locker Project</a></div></body></html>";
};