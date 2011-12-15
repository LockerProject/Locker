#!/bin/bash
set -v

# Make sure we're inside the Travis-CI environment before we do all this
if [ "$TRAVIS" != "true" ]; then
    exit 0
fi

# If the environment doesn't have clucene build it in
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
    grep "local" /etc/ld.so.conf || (sudo sh -c "echo \"/usr/local/lib\" >> /etc/ld.so.conf" && sudo ldconfig)
    cd $curDir
    rm -rf $workDir
fi

# Make sure our submodules are happy
git submodule update --init
