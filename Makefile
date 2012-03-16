export GIT_REVISION?=$(shell git rev-parse --short --default HEAD)
# if not provided by Jenkins, then just use the gitrev
export BUILD_NUMBER?=git-$(GIT_REVISION)

all: submodules build
	@echo
	@echo "Looks like everything worked!"
	@echo "Get some API keys (https://github.com/LockerProject/Locker/wiki/GettingAPIKeys) and then try running:"
	@echo "./locker"
	@echo
	@echo "Once running, visit http://localhost:8042 in your web browser."

# install system level dependencies into deps/
deps:
	./scripts/install-deps deps
	@echo
	@echo "Go ahead and run 'make'"
.PHONY: deps

# if building from git, make sure that the submodules are checked out
submodules:
	@if [ -d ./.git -a -f ./.gitmodules -a ! -d ./Apps/dashboardv3/static/common/.git ]; then \
		echo "Initializing submodules..."; \
		git submodule update --init; \
	fi

# check if system level dependencies are installed
check_deps:
	@. scripts/use-deps.sh && \
	if ! ./scripts/install-deps --check-only; then \
		echo Some dependencies are missing.  Try running "make deps" to install them.; \
		exit 1; \
	fi

# get Locker ready to run
build: check_deps npm_modules templates build.json
.PHONY: build

TEMPLATE_DIR=Apps/dashboardv3/static/common/templates
TEMPLATES=$(wildcard $(TEMPLATE_DIR)/*.html)
TEMPLATE_OUTPUT=$(TEMPLATE_DIR)/compiled_templates.json

# compile templates
templates: $(TEMPLATE_OUTPUT)

$(TEMPLATE_OUTPUT): $(TEMPLATES)
	@. scripts/use-deps.sh && \
	./Apps/dashboardv3/static/common/templates/compile.sh

# install node dependencies via npm
npm_modules:
	@. scripts/use-deps.sh && \
	npm install
.PHONY: npm_modules

# build.json allows Locker to report its build number and git revision at runtime
# the test suite pretends that tests/ is the top of the source tree,
# so drop a copy there too
build.json:
	echo '{ "build" : "$(BUILD_NUMBER)", "gitrev" : "$(GIT_REVISION)" }' \
	| tee $@ tests/$@
.PHONY: build.json

# run all of the tests
test: oldtest newtest

# new style mocha tests
MOCHA = ./node_modules/.bin/mocha
MOCHA_TESTS = $(shell find test -name "*.test.js")
newtest: build
	@env INTEGRAL_CONFIG=test/config.json \
	$(MOCHA) --growl --timeout 500 $(MOCHA_TESTS)

# old style vows tests
oldtest: build
	cd tests && \
	env NODE_PATH="$(PWD)/Common/node" \
	node ./runTests.js

SUBDIR=locker-$(BUILD_NUMBER)
DISTFILE=$(SUBDIR).tar.gz

# create a ready-to-run tarball with a complete build inside
bindist: $(DISTFILE)

$(DISTFILE): submodules
	./scripts/build-tarball "$(SUBDIR)" "$@"

# create a ready-to-run tarball, and then run tests on the contents
# (this is the rule that Jenkins runs -mdz 2012-02-04)
test-bindist: $(DISTFILE)
	./scripts/test-tarball "$(SUBDIR)" "$<"

clean:
	rm -f "$(DISTFILE)" "$(TEMPLATE_OUTPUT)" build.json tests/build.json
	rm -rf node_modules
