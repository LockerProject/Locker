#!/bin/sh

if [ "$TRAVIS" != "true" ]; then
    exit 0
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
