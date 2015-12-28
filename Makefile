BIN := node_modules/.bin
TYPESCRIPT := $(shell jq -r '.files[]' tsconfig.json)
JAVASCRIPT := $(TYPESCRIPT:%.ts=%.js)

all: $(JAVASCRIPT) $(TYPESCRIPT:%.ts=%.d.ts)

$(BIN)/tsc $(BIN)/mocha:
	npm install

%.js %.d.ts: %.ts $(BIN)/tsc
	$(BIN)/tsc -d

test: $(JAVASCRIPT) $(BIN)/mocha
	$(BIN)/mocha --compilers js:babel-core/register tests/
