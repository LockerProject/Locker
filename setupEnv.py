#!/usr/bin/python
from setuptools.command import easy_install
easy_install.main(["-U", "virtualenv"])
easy_install.main(["-U", "gdata"])
easy_install.main(["-U", "flask"])
easy_install.main(["-U", "pyparsing"])
