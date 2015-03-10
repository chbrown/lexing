# lexing

Lexing vs. Parsing: lexers make only a single pass (no back-tracking); parsers have transition tables and do lookahead. The lexer can have state, but it should only make state transitions based on the current input, and not look at old input while processing new input.

More formally, lexers can parse Chomsky's Level 3 grammars, but you need a parser for more Level 2 grammars (you'll probably still want to use a lexer, but it won't be enough). Level 3 is the most basic of the levels, and a Level 3 language can be represented by a single regular expression, though that's probably not the most maintainable representation. Level 2 includes things like TeX's nested braces, e.g., `\textit{You don't want to \textbf{stop at the X} and not realize that the Y should still be italicized}`, or PDF's nested strings, e.g., `(This is a long string (with (in parentheses) a parenthetical))`. You'll use a lexer to split the raw input into a stream of tokens, but then you'll need a parser to resolve the stream of tokens into discrete representations, e.g., a tree in the TeX case:

    var body = [{
      style: null,
      children: [{
        style: 'italic',
        children: [
          'You don't want to ',
          {
            style: 'bold',
            children: ['stop at the X'],
          },
          ' and not realize that the Y should still be italicized'
        ]
      }]
    }]

Or just a string in the PDF string case:

    "This is a long string (with (in parentheses) a parenthetical)"

The `new lexing.BufferedLexer(default_rules [, state_rules])` implementation provided in this module represents state as a stack of things (hopefully just strings), but this could be abused. The lexer constructor takes an optional second argument: an object mapping state names to lists of rules that apply only in those states. These operate like exclusive conditional states in `flex`, except there are no exceptions to the exclusivity, i.e., there is no `<*>` condition specifier. The current state is the last (top) state in the state stack. The `default_rules` rules apply only when the state stack is empty (the default).

The lexer has one main function, `lexer.read()`. This reads an input_string from the `lexer.reader` instance, and iterates over the rules that apply in the current state.

Each rule is a `[RegExp, Function]` tuple. When a rule's regular expression matches the input, the following happens:

1. We keep the value returned from `input_string.match(rule[0])` as `match`.
2. The input cursor is advanced over the length of the full match (`match[0]`).
3. The lexer returns the result of calling `input_string.match(rule[0])`, with the lexer bound as `this` inside the function.

If no rules in the current state match the current input, the lexer will throw an "Invalid language" error.

The lexer has another function: `lexer.next()`, which calls `lexer.read()` in a loop until it returns a non-null result, and returns that result.


## Quickstart

From the shell in your project's root directory:

    npm install lexing --save

In your code:

    var lexing = require('lexing');

    // It will use the first rule with a matching regex, so go from more specific
    // to more catch-all. The ^ anchor before every regex is required!
    var rules = [
      [/^$/, function(match) {
        return ['EOF', null];
      }],
      [/^\s+/, function(match) {
        return null; // ignore whitespace
      }],
      [/^[^!"#$%&'()*+,\-./:;<=>?@[\\\]\^_`{|}~]+/, function(match) {
        return ['TOKEN', match[0]];
      }],
      [/^./, function(match) {
        return ['PUNCTUATION', match[0]];
      }],
    ];

    var lexer = new lexing.BufferedLexer(rules);

    lexer.reader = new lexing.BufferedStringReader("'It wasn't at all my fault', I cried.");

    do {
      var token_value = lexer.next();
      console.log('token=%s => %j', token_value[0], token_value[1]);
    } while (token_value[0] !== 'EOF');


## TypeScript integration

You should have the Node.js type declarations in your project at `type_declarations/DefinitelyTyped/node/node.d.ts`.

If you have an `index.d.ts` reference collector at `type_declarations/index.d.ts`, like I do, you can configure it so to pull in the `lexing.d.ts` declarations:

    // the usual imports:
    /// <reference path="DefinitelyTyped/node/node.d.ts" />
    /// <reference path="DefinitelyTyped/async/async.d.ts" />
    /// <reference path="DefinitelyTyped/yargs/yargs.d.ts" />

    // the self-declaring packages:
    /// <reference path="../node_modules/lexing/lexing.d.ts" />


## Building

You'll need the TypeScript compiler and the `node.d.ts` type declarations from the `DefinitelyTyped` repo. The following command will install / download those, compile `index.ts` to `index.js` and build `lexing.d.ts` from `index.ts`, as needed:

    make


### Development

TypeScript doesn't make exporting an importable set of type declarations easy. [adts](https://github.com/chbrown/adts) was my first foray into hacking a `tsc --declaration` build-step together, but this module takes a different approach. There are a couple requirements for making this work:

1. `////` markers in the TypeScript source to designate module boundaries when generating the declarations. TypeScript uses `///` to configure the compiler, so I use `////` to confuse their compiler into giving me what I want. The declaration build step in the Makefile strips these markers.
2. The 3rd-party package that's using `lexing` installs things with `npm` as usual, and has Node.js type declarations at `type_declarations/DefinitelyTyped/node/node.d.ts`. If `lexing` includes its own Node.js type declarations, the TypeScript compiler will complain about all kinds of duplicates / conflicts. (This is even if the two Node.js type declarations are identical -- they must be at the same filepath for TypeScript to recognize that they are the same.)


## License

Copyright 2015 Christopher Brown. [MIT Licensed](http://opensource.org/licenses/MIT).
