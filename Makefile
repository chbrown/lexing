BIN := node_modules/.bin
DTS := node/node mocha/mocha

all: index.js index.d.ts
type_declarations: $(DTS:%=type_declarations/DefinitelyTyped/%.d.ts)

$(BIN)/tsc $(BIN)/mocha:
	npm install

index.js index.d.ts: index.ts $(BIN)/tsc
	$(BIN)/tsc -d

type_declarations/DefinitelyTyped/%:
	mkdir -p $(@D)
	curl -s https://raw.githubusercontent.com/chbrown/DefinitelyTyped/master/$* > $@

test: index.js tests/simple.js $(BIN)/mocha
	$(BIN)/mocha --recursive tests/

dev: $(BIN)/tsc
	$(BIN)/tsc -m commonjs -t ES5 -w index.ts
