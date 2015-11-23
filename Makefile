BIN := node_modules/.bin
DTS := node/node mocha/mocha

all: index.js index.d.ts

$(BIN)/tsc $(BIN)/mocha:
	npm install

index.js index.d.ts: index.ts $(BIN)/tsc
	$(BIN)/tsc -d

dev: $(BIN)/tsc
	$(BIN)/tsc -w

test: index.js $(BIN)/mocha
	$(BIN)/mocha --compilers js:babel-core/register tests/
