import * as assert from 'assert';
import 'mocha';

import {compare, indexOf, equalTo} from '../buffer';

describe('buffer util', () => {
  describe('#compare', () => {
    const haystack = Buffer.from('<< /Name (hello) >>');
    it('should start with <<', () => {
      assert(compare(haystack, Buffer.from('<<')));
    });
    it('should not start with "other"', () => {
      assert.strictEqual(compare(haystack, Buffer.from('other')), false);
    });
  });

  describe('#indexOf', () => {
    const haystack = Buffer.from('<< /Name (hello) >>');
    it('should have hello at index 0', () => {
      assert.strictEqual(indexOf(haystack, Buffer.from('hello')), 10);
    });
    it('should not have other at index 0', () => {
      assert.strictEqual(indexOf(haystack, Buffer.from('other')), undefined);
    });
  });

  describe('#equalTo', () => {
    const haystack = Buffer.from('hello world');
    it('should equal hello at 0:5', () => {
      assert.strictEqual(equalTo(haystack, Buffer.from('hello'), 0, 5), true);
    });
    it('should equal he at 0:2', () => {
      assert.strictEqual(equalTo(haystack, Buffer.from('he'), 0, 2), true);
    });
    it('should not equal world at index 0:5', () => {
      assert.strictEqual(equalTo(haystack, Buffer.from('world'), 0, 5), false);
    });
  });
});
