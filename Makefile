BIN := node_modules/.bin

all: index.js index.d.ts

$(BIN)/tsc $(BIN)/mocha:
	npm install

index.js index.d.ts: index.ts $(BIN)/tsc
	$(BIN)/tsc -d

test: index.js $(BIN)/mocha
	$(BIN)/mocha --compilers js:babel-core/register tests/
