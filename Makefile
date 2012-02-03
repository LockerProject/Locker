all: build

build:
	npm install

test: build
	npm test

bindist:
	./mktarball.sh

clean:
	echo "Surely you must be joking."
	exit 1

.PHONY: build
