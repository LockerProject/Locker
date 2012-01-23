#!/bin/bash

set -e

rev=$(git rev-parse --short --default HEAD $rev)
subdir=locker-$rev
top=$PWD
out=$PWD/locker-$rev.tar.gz
builddir=$top/build
buildlog=$(tempfile build)

rm -rf $builddir
mkdir -p $builddir/$subdir

trap "rm -rf $builddir" EXIT

# fetch a clean copy of the code from git
echo "Fetching code..."
git archive $rev | tar -x -C $builddir/$subdir

echo "Building..."
cd $builddir/$subdir
npm install 2>&1 | tee -a $buildlog

echo "Compressing..."
(cd $builddir; tar czf $out $subdir)

# The test suite doesn't clean up after itself, so do this last
#echo "Testing..."
#cd $builddir/$subdir/tests
#if ! node runTests.js; then
#    echo "Tests failed!"
#    rm -f $out
#    exit 1
#fi

echo "Done."
echo $out
