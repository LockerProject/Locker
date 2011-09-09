#!/bin/sh

txtrst=$(tput sgr0) # Text reset
txtred=$(tput setaf 1) # Red
txtgrn=$(tput setaf 2) # Green

check_for() {
    found=`which $2`
    version=`$3 2>&1 | grep -o -E [-0-9.]\{1,\} | head -n 1`
    if [ -z "$found" ]; then
        echo "${txtred}$1 not found!${txtrst}" >&2
    else
        echo "$1 version $version found." >&2
        if [ -z "$4" ]; then
            return
        fi
    fi
    if [ -n "$4" ]; then
        result=`python -c 'print tuple("$version".split(".")) >= tuple("$4".split("."))'`
        if [ "$result" = "False" ]; then
            echo "${txtred}$1 version $4 or greater required!${txtrst}" >&2
        fi
        if [ -n "$5" ]; then
            if [ "$version" \> "$5" ]; then
                echo "${txtred}$1 version $5 or less required!${txtrst}" >&2
            fi
        fi
    else
        exit 1
    fi
}


check_for Python python 'python -V' 2.6
check_for Node.js node 'node -v' 0.4.6 0.4.999999
check_for npm npm "npm -v" 1
check_for mongoDB mongod "mongod --version" 1.8.0
if [ "$1" = "--vows" ] ; then
    check_for Vows vows "vows --version" 0.5.8
fi
