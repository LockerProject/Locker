all: build

build:
	npm install

test: build
	cd tests && ./runTests

BUILD_NUMBER?=git-$(shell git rev-parse --short --default HEAD)
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
