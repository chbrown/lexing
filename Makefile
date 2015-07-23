DTS := node/node mocha/mocha
BIN := node_modules/.bin

all: lexing.d.ts index.js
type_declarations: $(DTS:%=type_declarations/DefinitelyTyped/%.d.ts)

$(BIN)/tsc $(BIN)/mocha:
	npm install

%.js: %.ts type_declarations $(BIN)/tsc
	$(BIN)/tsc --module commonjs --target ES5 $<

type_declarations/DefinitelyTyped/%:
	mkdir -p $(@D)
	curl -s https://raw.githubusercontent.com/chbrown/DefinitelyTyped/master/$* > $@

lexing.d.ts: index.ts
	# remove the quadruple-slash meta-comment
	sed 's:^//// ::g' $< > module.ts
	$(BIN)/tsc --module commonjs --target ES5 --declaration module.ts
	# change the module name to a string,
	cat module.d.ts | \
		sed 's:declare module lexing:declare module "lexing":' > $@
	# cleanup
	rm module.{ts,d.ts,js}

.PHONY: test
test: index.js test/simple.js $(BIN)/mocha
	$(BIN)/mocha --recursive test/

dev: $(BIN)/tsc
	$(BIN)/tsc -m commonjs -t ES5 -w index.ts
