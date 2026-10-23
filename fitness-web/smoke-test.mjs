// Lightweight browser-free smoke test of Fit Studio's web entry point.
// Run with: node fitness-web/smoke-test.mjs
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
assert.equal(scripts.length,1,'Expected one self-contained script');
new vm.Script(scripts[0],{filename:'fitness-web/index.html'});
const expected=['data-action="mode"','data-action="start"','data-action="set"','data-action="finish"','data-action="saveprofile"','data-action="page"','function view()','function rest()'];
for(const item of expected)assert.ok(scripts[0].includes(item), 'Missing interactive element: '+item);
const workouts=scripts[0].match(/name:'[^']+',ex:\[[^\]]+\]/g)||[];
assert.equal(workouts.length,6,'Expected 6 starter workout programs');
assert.ok(html.includes('viewport-fit=cover'),'Missing iOS viewport');
assert.ok(html.includes('localStorage'),'Missing local persistence');
console.log('Fit Studio Safari smoke test passed: valid JS, 6 programs, navigation, workout tracking, timer, profile and persistence.');
