export GIT_REVISION?=$(shell git rev-parse --short --default HEAD)
# if not provided by Jenkins, then just use the gitrev
export BUILD_NUMBER?=git-$(GIT_REVISION)

TESTS = $(shell find test -name "*.test.js")
MOCHA = ./node_modules/.bin/mocha
RUNALL = env INTEGRAL_CONFIG=test/config.json $(MOCHA) $(TESTS)
DEFAULT_OPTS = --growl --timeout 500

all: submodules checkdeps build
	@echo
	@echo "Looks like everything worked!"
	@echo "Get some API keys (https://github.com/LockerProject/Locker/wiki/GettingAPIKeys) and then try running:"
	@echo "./locker"
	@echo
	@echo "Once running, visit http://localhost:8042 in your web browser."

deps:
	./scripts/install-deps deps
	@echo
	@echo "Go ahead and run 'make'"

submodules:
	@if [ -d ./.git -a -f ./.gitmodules -a ! -d ./Apps/dashboardv3/static/common/.git ]; then \
		echo "Initializing submodules..."; \
		git submodule update --init; \
	fi

checkdeps:
	@. scripts/use-deps.sh && \
	if ! ./scripts/install-deps --check-only; then \
		echo Some dependencies are missing.  Try running "make deps" to install them.; \
		exit 1; \
	fi

build: checkdeps npm_modules build.json
	@. scripts/use-deps.sh && \
	./Apps/dashboardv3/static/common/templates/compile.sh

npm_modules:
	@. scripts/use-deps.sh && \
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

$(DISTFILE): submodules
	./scripts/build-tarball "$(SUBDIR)" "$@"

# This is the rule that Jenkins runs -mdz 2012-02-04
test-bindist: $(DISTFILE)
	./scripts/test-tarball "$(SUBDIR)" "$<"

clean:
	rm -f "$(DISTFILE)" build.json tests/build.json
	rm -rf node_modules

.PHONY: build npm_modules build.json deps
