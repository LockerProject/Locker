export GIT_REVISION?=$(shell git rev-parse --short --default HEAD)
# if not provided by Jenkins, then just use the gitrev
export BUILD_NUMBER?=git-$(GIT_REVISION)

TESTS = $(shell find test -name "*.test.js")
MOCHA = ./node_modules/.bin/mocha
RUNALL = env INTEGRAL_CONFIG=test/config.json $(MOCHA) $(TESTS)
DEFAULT_OPTS = --growl --timeout 500

all: build

build: npm_modules build.json
	./Apps/dashboardv3/static/common/templates/compile.sh

npm_modules:
	npm install

# the test suite pretends that tests/ is the top of the source tree,
# so drop a copy there too
build.json:
	echo '{ "build" : "$(BUILD_NUMBER)", "gitrev" : "$(GIT_REVISION)" }' \
	| tee $@ tests/$@

test: oldtest newtest

newtest: build
	@$(RUNALL) $(DEFAULT_OPTS)

oldtest: build
	cd tests && \
	env NODE_PATH="$(PWD)/Common/node" \
	node ./runTests.js

SUBDIR=locker-$(BUILD_NUMBER)
DISTFILE=$(SUBDIR).tar.gz

bindist: $(DISTFILE)

$(DISTFILE):
	./scripts/build-tarball "$(SUBDIR)" "$@"

# This is the rule that Jenkins runs -mdz 2012-02-04
test-bindist: $(DISTFILE)
	./scripts/test-tarball "$(SUBDIR)" "$<"

clean:
	rm -f "$(DISTFILE)" build.json tests/build.json
	rm -rf node_modules

.PHONY: build npm_modules build.json
