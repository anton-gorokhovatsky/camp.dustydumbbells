import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { phoneParts, internationalPhone, normaliseBirthday, calendarMove } from '../site/form-values.js';
import { validateFields, travelField, validBirthday } from '../site/application-validation.js';

test('national numbers, international paste, country changes and invalid text keep their meaning', () => {
  for (const [value,iso,wanted] of [['999 123-45-67','ru','+79991234567'],['555 111 22 33','tr','+905551112233'],['20 1234 5678','gb','+442012345678']]) {
    const parts=phoneParts(value,iso);
    assert.equal(internationalPhone(parts.national,parts.iso),wanted);
  }
  assert.deepEqual(phoneParts('+90 (555) 111-22-33','ru'),{iso:'tr',national:'5551112233'});
  assert.deepEqual(phoneParts('+7 999 1234567','ru'),{iso:'ru',national:'9991234567'});
  assert.equal(internationalPhone('','tr'),'');
  assert.equal(internationalPhone('8 (999) 123-45-67','ru'),'+79991234567');
  assert.equal(internationalPhone('07911 123456','gb'),'+447911123456');
  assert.equal(internationalPhone('0555 111 22 33','tr'),'+905551112233');
  assert.equal(internationalPhone('06 12345678','it'),'+390612345678');
  assert.equal(internationalPhone('abc 1234567','ru'),'abc 1234567');
  assert.equal(internationalPhone(phoneParts('+abc1234567','ru').national,'ru'),'+abc1234567');
});

test('owned phone values satisfy the existing paired transport contract without hidden stale partner data', () => {
  const fields={Name:'Тестовый участник',Date:'01.01.1990',Email:'test@example.invalid',Phone:internationalPhone('9991234567','ru'),[travelField]:'С партнёром',Name_2:'Тестовый партнёр',Date_2:'02.02.1991',Email_2:'partner@example.invalid',Phone_2:internationalPhone('5551112233','tr')};
  assert.deepEqual(validateFields(fields),{});
  assert.equal(validateFields({...fields,Phone_2:internationalPhone('abc 1234567','tr')}).Phone_2,'Укажите телефон с кодом страны.');
  assert.deepEqual(validateFields({...fields,[travelField]:'Один',Phone_2:'bad',Date_2:'bad'}),{});
});

test('calendar keys cross month/year boundaries and clamp month changes without changing the chosen birthday', () => {
  const parts=date=>[date.getFullYear(),date.getMonth()+1,date.getDate()];
  assert.deepEqual(parts(calendarMove(new Date(2024,0,31),'PageDown')),[2024,2,29]);
  assert.deepEqual(parts(calendarMove(new Date(2024,1,29),'PageDown',true)),[2025,2,28]);
  assert.deepEqual(parts(calendarMove(new Date(2000,0,1),'ArrowLeft')),[1999,12,31]);
  assert.deepEqual(parts(calendarMove(new Date(2000,0,1),'Home')),[1999,12,27]);
  assert.deepEqual(parts(calendarMove(new Date(2000,0,1),'End')),[2000,1,2]);
  assert.equal(normaliseBirthday('29022000'),'29.02.2000');
  assert(validBirthday(normaliseBirthday('29/02/2000')));
  assert(!validBirthday(normaliseBirthday('31022000')));
});

test('the published document has one main and a complete heading outline while retaining every photograph and day', async () => {
  const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
  assert.equal((html.match(/<main\b/g)||[]).length,1);
  assert.equal((html.match(/<h1\b/g)||[]).length,1);
  assert.equal((html.match(/<h2\b/g)||[]).length,5);
  assert.equal((html.match(/<h3\b/g)||[]).length,16);
  for(const section of ['about','programme','weather','travel','form'])assert(html.includes(`id="dd-heading-${section}"`));
  for(let day=11;day<=25;day++)assert(html.includes(`id="dd-day-${day}"`));
  assert(html.includes('class="dd-skip-link" href="#dd-main"'));
  assert(html.includes('data-dd-marquee-toggle'));
  assert.equal((html.match(/class="t1003"/g)||[]).length,3);
  assert.equal((html.match(/class="t-img t1148__img"/g)||[]).length,11);
  assert.equal((html.match(/третий год подряд/g)||[]).length,1);
});

test('the active entry no longer starts retired form, anchor or analytics runtimes; unselected experiments are not shipped', async () => {
  const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
  assert(!/t_datepicker_init\(|t_form_phonemask_load\(|t_form__conditionals_initFields\(|t270_scroll\(|tilda-stat/i.test(html));
  assert(html.includes('data-dd-widgets'));
  for(const path of ['direction/screen.js','direction/coral-current.js','direction/travel-ticket.css','direction/media/hotels']) {
    await assert.rejects(stat(new URL('../dist/'+path,import.meta.url)),{code:'ENOENT'});
  }
  assert((await stat(new URL('../site/direction/screen.js',import.meta.url))).isFile());
  assert((await stat(new URL('../source/captures/2026-10-23/index.html',import.meta.url))).isFile());
});
