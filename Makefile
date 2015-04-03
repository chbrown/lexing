all: lexing.d.ts index.js

.PHONY: type_declarations test

type_declarations: type_declarations/DefinitelyTyped/node/node.d.ts \
	type_declarations/DefinitelyTyped/mocha/mocha.d.ts

node_modules/.bin/tsc node_modules/.bin/mocha:
	npm install

%.js: %.ts | node_modules/.bin/tsc type_declarations
	node_modules/.bin/tsc --module commonjs --target ES5 $<

type_declarations/DefinitelyTyped/%:
	mkdir -p $(shell dirname $@)
	curl https://raw.githubusercontent.com/borisyankov/DefinitelyTyped/master/$* > $@

lexing.d.ts: index.ts
	# remove the quadruple-slash meta-comment
	sed 's:^//// ::g' $< > module.ts
	node_modules/.bin/tsc --module commonjs --target ES5 --declaration module.ts
	cat module.d.ts | \
		# change the module name to a string
		sed 's:export declare module lexing:declare module "lexing":' | \
		# and relativize the reference[path] import value to where it would be relative to the node_modules subdirectory
		sed 's:type_declarations:../../type_declarations:' > $@
	# cleanup
	rm module.{ts,d.ts,js}

test: index.js test/simple.js | node_modules/.bin/mocha
	node_modules/.bin/mocha --recursive test/
