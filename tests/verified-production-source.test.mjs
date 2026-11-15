import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

test('frozen regression baseline matches all 324 independently recorded deployed source hashes',()=>{
  const manifest=JSON.parse(readFileSync('tests/fixtures/production-source-20261110.json','utf8'));
  assert.equal(manifest.deployment,'dpl_6kmeJpzHY4giH1i7RdADPxuNX8hg');
  assert.equal(manifest.files.length,324);
  assert.equal(new Set(manifest.files.map(x=>x.path)).size,324);
  for(const file of manifest.files){
    const bytes=execFileSync('git',['show',`${manifest.baselineCommit}:${file.path}`],{maxBuffer:20*1024*1024});
    assert.equal(createHash('sha1').update(bytes).digest('hex'),file.sha1,file.path);
  }
});
