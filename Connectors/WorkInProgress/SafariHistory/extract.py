#
# Copyright (C) 2011, The Locker Project
# All rights reserved.
#
# Please see the LICENSE file for more information.
#

#!/usr/bin/env python
# encoding: UTF-8
"""
untitled.py

Created by Simon Murtha-Smith on 2010-12-16.
Copyright (c) 2010 __MyCompanyName__. All rights reserved.
"""

import sys
import os
import plistlib


def main():
    plistlib.readPlist('TopSites.plist')


if __name__ == '__main__':
    main()

