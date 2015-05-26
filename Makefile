DTS := node/node mocha/mocha

all: lexing.d.ts index.js
type_declarations: $(DTS:%=type_declarations/DefinitelyTyped/%.d.ts)

node_modules/.bin/tsc node_modules/.bin/mocha:
	npm install

%.js: %.ts type_declarations node_modules/.bin/tsc
	node_modules/.bin/tsc --module commonjs --target ES5 $<

type_declarations/DefinitelyTyped/%:
	mkdir -p $(@D)
	curl -s https://raw.githubusercontent.com/chbrown/DefinitelyTyped/master/$* > $@

lexing.d.ts: index.ts type_declarations
	# remove the quadruple-slash meta-comment
	sed 's:^//// ::g' $< > module.ts
	node_modules/.bin/tsc --module commonjs --target ES5 --declaration module.ts
	# change the module name to a string,
	# and relativize the reference[path] import value to where it would be relative to the node_modules subdirectory
	cat module.d.ts | \
		sed 's:export declare module lexing:declare module "lexing":' | \
		sed 's:type_declarations:../../type_declarations:' > $@
	# cleanup
	rm module.{ts,d.ts,js}

.PHONY: test
test: index.js test/simple.js node_modules/.bin/mocha
	node_modules/.bin/mocha --recursive test/

dev: node_modules/.bin/tsc
	node_modules/.bin/tsc -m commonjs -t ES5 -w index.ts
