BUILD_NUMBER?=git-$(shell git rev-parse --short --default HEAD)
TESTS = $(shell find test -name "*.test.js")
MOCHA = ./node_modules/.bin/mocha
RUNALL = env INTEGRAL_CONFIG=test/config.json $(MOCHA) $(TESTS)
DEFAULT_OPTS = --growl --timeout 100

all: build

build:
	npm install
	echo "\"$(BUILD_NUMBER)\"" |tee build.json tests/build.json

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
	echo "Surely you must be joking."
	exit 1

.PHONY: build
