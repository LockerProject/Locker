#!/bin/sh

if [ "$TRAVIS" != "true" ]; then
    echo "This script is for configuring the Travis-CI environment only."
    exit 1
fi

ldconfig -v | grep clucene
if [ "$?" == "1" ]; then
    sudo apt-get install -qy cmake
    curDir=`pwd`
    cd /tmp
    git clone git://clucene.git.sourceforge.net/gitroot/clucene/clucene
    mkdir clucene/build
    cd clucene/build
    cmake .. && make && sudo make install
    grep local /etc/ld.so.conf || (sudo echo "/usr/local/lib" >> /etc/ld.so.conf && sudo ldconfig)
    cd $curDir
fi
