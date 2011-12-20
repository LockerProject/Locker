#!/bin/bash
set -v

# Make sure we're inside the Travis-CI environment before we do all this
if [ "$TRAVIS" != "true" ]; then
    exit 0
fi

# Make sure our submodules are happy
git submodule update --init
