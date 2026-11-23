import assert from 'node:assert/strict';
import fs from 'node:fs';
import { messages } from '../js/messages.js';
import { t, resolveLanguage, localizeResource, formatNumber } from '../js/i18n.js';
import { LOCALIZED_IMAGES, localizedImagePath } from '../js/localized-assets.js';

for (const [original, variants] of Object.entries(LOCALIZED_IMAGES)) {
    assert.equal(localizedImagePath(original, 'ru'), original);
    assert.equal(localizedImagePath(original, 'unknown'), original);
    assert.equal(localizedImagePath(original, 'en'), variants.en);
    const source = fs.readFileSync(original), translated = fs.readFileSync(variants.en);
    assert.equal(translated.readUInt32BE(16), source.readUInt32BE(16), 'same PNG width');
    assert.equal(translated.readUInt32BE(20), source.readUInt32BE(20), 'same PNG height');
    assert.equal(translated[25], 6, 'RGBA PNG with transparency');
}

assert.equal(resolveLanguage('en','ru'),'en');
assert.equal(resolveLanguage('xx','en'),'en');
assert.equal(resolveLanguage(null,null),'ru');
assert.equal(resolveLanguage('EN','unsupported'),'ru');
for(const lang of ['ru','en']) {
    assert.deepEqual(messages[lang], JSON.parse(fs.readFileSync(`locales/${lang}.json`,'utf8')), 'regenerate messages.js after editing a locale');
    assert.equal(Object.keys(messages[lang]).filter(key=>key.startsWith('story.')).length,40);
    for(const [key,value] of Object.entries(messages[lang])) {
        assert.equal(typeof value,'string'); assert.ok(value.trim(),key);
        if(lang==='en' && key!=='language.ru') assert.ok(!/[А-Яа-яЁё]/.test(value),key);
    }
}
assert.deepEqual(Object.keys(messages.ru).sort(),Object.keys(messages.en).sort());
const placeholders=value=>[...value.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
for(const key of Object.keys(messages.ru)) assert.deepEqual(placeholders(messages.ru[key]),placeholders(messages.en[key]),key);
assert.equal(t('game.title'),'Кликер: Жуки против еды');
assert.equal(t('game.006',{p0:7}),'Уровень 7');
assert.equal(formatNumber(1.5),'1,5');
assert.throws(()=>t('not.a.key'),/Unknown localization key/);
assert.deepEqual(localizeResource({button:'@i18n:home.play',items:['unchanged']}),{button:'ИГРАТЬ',items:['unchanged']});
for(const file of ['images/ui/results/layout.json','images/ui/results/intro-layout.json','images/dishes/layout.json']) {
    const data=localizeResource(JSON.parse(fs.readFileSync(file,'utf8')));
    assert.ok(!JSON.stringify(data).includes('@i18n:'));
}
for(const file of ['game.js','levels.js','cutscenes.js',...fs.readdirSync('js').filter(f=>f.endsWith('.js')&&!f.endsWith('.min.js')).map(f=>'js/'+f)]) {
    for(const [,key] of fs.readFileSync(file,'utf8').matchAll(/\bt\('([^']+)'/g)) assert.ok(Object.hasOwn(messages.ru,key),`${file}: ${key}`);
}
console.log('Localization: catalog parity, all 40 memories, parameters, resource keys, RU fallback and number formatting passed.');
