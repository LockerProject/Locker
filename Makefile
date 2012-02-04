BUILD_NUMBER?=git-$(shell git rev-parse --short --default HEAD)

all: build

build:
	npm install
	echo "\"$(BUILD_NUMBER)\"" |tee build.json tests/build.json

test: build
	cd tests && ./runTests

SUBDIR=locker-$(BUILD_NUMBER)
DISTFILE=$(SUBDIR).tar.gz

bindist: $(DISTFILE)

$(DISTFILE):
	./scripts/mktarball "$(SUBDIR)" "$@"

test-bindist: $(DISTFILE)
	set -e; \
	tmpdir=$$(mktemp -d); \
	trap "rm -rf '$$tmpdir'" EXIT; \
	tar xf "$(DISTFILE)" -C "$$tmpdir"; \
	cd $$tmpdir/$(SUBDIR); \
	$(MAKE) test

clean:
	echo "Surely you must be joking."
	exit 1

.PHONY: build
