all: index.js lexing.d.ts type_declarations

.PHONY: type_declarations
type_declarations: type_declarations/DefinitelyTyped/node/node.d.ts

node_modules/.bin/tsc:
	npm install

%.js: %.ts node_modules/.bin/tsc type_declarations
	node_modules/.bin/tsc --module commonjs --target ES5 $<

type_declarations/DefinitelyTyped/%:
	mkdir -p $(shell dirname $@)
	curl https://raw.githubusercontent.com/borisyankov/DefinitelyTyped/master/$* > $@

lexing.d.ts: index.ts
	sed 's:^//// ::g' $< > module.ts
	node_modules/.bin/tsc --module commonjs --target ES5 --declaration module.ts
	# change the module name to a string and shave off the reference import line
	cat module.d.ts | \
		sed 's:export declare module lexing:declare module "lexing":' | \
		sed 's:type_declarations:../../type_declarations:' > $@
	# cleanup
	rm module.{ts,d.ts,js}
