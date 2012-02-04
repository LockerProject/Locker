#!/bin/bash

set -e

rev=$(git rev-parse --short --default HEAD $rev)
build_id=${BUILD_NUMBER:-$rev}
subdir="locker-$build_id"
top="$PWD"
out="$PWD/locker-$build_id.tar.gz"
builddir="$top/build"
builddir="$(mktemp -d)"

rm -rf "$builddir"
mkdir -p "$builddir/$subdir"

trap "rm -rf \"$builddir\"" EXIT

# fetch a clean copy of the code from git
echo "Fetching code..."
# This doesn't work anymore with submodules.  I hate submodules.
# git archive $rev | tar -x -C "$builddir/$subdir"
rsync -a "$top/" "$builddir/$subdir"
(cd "$builddir/$subdir" && git submodule update --init && git clean -fdx)
find "$builddir/$subdir" -name .git -print0 | xargs -0 rm -rf

if test -d "$top/node_modules"; then
    cp -a "$top/node_modules" "$builddir/$subdir"
else
    echo "Building..."
    (cd "$builddir/$subdir" && npm install)
fi
mkdir -p "$builddir/$subdir/Me"

echo "Compressing..."
(cd "$builddir"; tar czf "$out" "$subdir")

# The test suite doesn't clean up after itself, so do this last
#echo "Testing..."
#cd "$builddir/$subdir/tests"
#if ! node runTests.js; then
#    echo "Tests failed!"
#    rm -f "$out"
#    exit 1
#fi

echo "Done."
echo "$out"
