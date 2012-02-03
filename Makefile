all: build

build:
	npm install

test: build
	cd tests && ./runTests

bindist: build
	./mktarball.sh

clean:
	echo "Surely you must be joking."
	exit 1

.PHONY: build
