#!/bin/sh

if [ "$TRAVIS" != "true" ]; then
    exit 0
fi

ldconfig -p | grep clucene
if [ "$?" == "1" ]; then
    sudo apt-get install -qy cmake
    curDir=`pwd`
    workDir=`mktemp -d`
    cd $workDIr 
    git clone git://clucene.git.sourceforge.net/gitroot/clucene/clucene
    mkdir clucene/build
    cd clucene/build
    cmake .. && make && sudo make install
    grep local /etc/ld.so.conf || (sudo sh -c "echo \"/usr/local/lib\" >> /etc/ld.so.conf" && sudo ldconfig)
    rm -rf $workDir
    cd $curDir
fi
