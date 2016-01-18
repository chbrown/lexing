BIN := node_modules/.bin
TYPESCRIPT := $(shell jq -r '.files[]' tsconfig.json)

all: $(TYPESCRIPT:%.ts=%.js) $(TYPESCRIPT:%.ts=%.d.ts) .npmignore .gitignore

.npmignore: tsconfig.json
	echo $(TYPESCRIPT) Makefile tsconfig.json coverage/ | tr ' ' '\n' > $@

.gitignore: tsconfig.json
	echo $(TYPESCRIPT:%.ts=%.js) $(TYPESCRIPT:%.ts=%.d.ts) coverage/ | tr ' ' '\n' > $@

$(BIN)/tsc $(BIN)/_mocha $(BIN)/istanbul $(BIN)/coveralls:
	npm install

%.js %.d.ts: %.ts $(BIN)/tsc
	$(BIN)/tsc -d

test: $(TYPESCRIPT:%.ts=%.js) $(BIN)/istanbul $(BIN)/_mocha $(BIN)/coveralls
	$(BIN)/istanbul cover $(BIN)/_mocha -- --compilers js:babel-core/register tests/ -R spec
	cat coverage/lcov.info | $(BIN)/coveralls || true
