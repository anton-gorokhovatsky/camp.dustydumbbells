import { phoneCountries } from './phone-countries.js';
import { phoneParts, internationalPhone, normaliseBirthday, calendarMove } from './form-values.js';
import { validBirthday, travelField } from './application-validation.js';
import { smoothCorners } from './smooth-corners.js';

const days = ['понедельник','вторник','среда','четверг','пятница','суббота','воскресенье'];
const shortDays = ['пн','вт','ср','чт','пт','сб','вс'];
const dateLabel = new Intl.DateTimeFormat('ru', {day:'numeric',month:'long',year:'numeric'});
const months = Array.from({length:12},(_,i)=>new Intl.DateTimeFormat('ru',{month:'long'}).format(new Date(2000,i,1)));
const regions = new Intl.DisplayNames(['ru'], {type:'region'});
const partner = name => /_2$|-p$/.test(name || '');
const stamp = date => `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
const parseStamp = text => { const [y,m,d]=text.split('-').map(Number); return new Date(y,m-1,d); };
const focusable = container => [...container.querySelectorAll('button,input,textarea,select,a[href],[tabindex="0"]')]
  .filter(el=>!el.disabled && el.tabIndex>=0 && el.type !== 'hidden' && !el.closest('[hidden],[inert]') && el.getBoundingClientRect().height);

export function initFormWidgets(form) {
  if (form.dataset.widgetsReady) return;
  form.dataset.widgetsReady = 'yes';
  const partnerFields = groupForm(form);
  const inputs = [...form.querySelectorAll('input:not([type="radio"]):not([type="hidden"]),textarea')];
  for (const input of inputs) {
    const label = input.getAttribute('placeholder') || input.getAttribute('aria-label');
    if (!input.getAttribute('aria-label') && label) input.setAttribute('aria-label', label);
    if (input.type !== 'tel' && label) {
      input.classList.add('t-input_pvis');
      input.placeholder = '';
      if (!input.nextElementSibling?.classList.contains('t-input__vis-ph')) {
        const visual = document.createElement('div');
        visual.className = 't-input__vis-ph'; visual.textContent = label;
        input.after(visual);
      }
      const sync = () => input.classList.toggle('t-input_has-content', !!input.value);
      input.addEventListener('input',sync); input.addEventListener('change',sync); sync();
    }
    if (input.name.startsWith('Name')) input.autocomplete = `${partner(input.name) ? 'section-partner' : 'section-main'} name`;
    if (input.type === 'email') input.autocomplete = `${partner(input.name) ? 'section-partner' : 'section-main'} email`;
    if (input.type === 'tel') initPhone(input);
    if (input.classList.contains('t-datepicker')) initCalendar(input,form);
  }
  const groups = [...form.querySelectorAll('[data-field-name]')].filter(group=>partner(group.dataset.fieldName));
  const updatePartner = () => {
    const visible = form.querySelector(`input[name="${travelField}"]:checked`)?.value === 'С партнёром';
    partnerFields.hidden=!visible; partnerFields.inert=!visible; partnerFields.disabled=!visible;
    groups.forEach(group=>{group.hidden=!visible; group.inert=!visible; group.setAttribute('aria-hidden',String(!visible));});
  };
  form.addEventListener('change',event=>{ if (event.target.name === travelField) updatePartner(); });
  updatePartner();
}

function groupForm(form) {
  const box=form.querySelector('.t-form__inputsbox');
  const groups=[...box.querySelectorAll(':scope > [data-field-name]')];
  const travel=groups.find(group=>group.dataset.fieldName===travelField);
  const wishes=groups.find(group=>group.dataset.fieldName==='Textarea');
  const section=(title,id,fields)=>{
    const fieldset=document.createElement('fieldset');
    fieldset.className='dd-person-fields'; fieldset.id=id;
    const legend=document.createElement('legend'); legend.textContent=title;
    fieldset.append(legend,...fields); return fieldset;
  };
  const main=section('Ваши данные','dd-main-fields',groups.filter(group=>group!==travel&&group!==wishes&&!partner(group.dataset.fieldName)));
  const companion=section('Данные партнёра','dd-partner-fields',groups.filter(group=>partner(group.dataset.fieldName)));
  travel.classList.add('dd-travel-choice');
  for(const label of travel.querySelectorAll('.t-radio__control')) {
    const indicator=label.querySelector('.t-radio__indicator');
    indicator.setAttribute('aria-hidden','true');
    label.dataset.ddSmooth='paint'; smoothCorners(label);
    label.querySelector('input').setAttribute('aria-controls',companion.id);
  }
  box.prepend(travel,main,companion,wishes);
  return companion;
}

function initPhone(input) {
  const name = input.name;
  const wrap = document.createElement('div');
  wrap.className = 't-input t-input-phonemask__wrap t-input_bbonly';
  wrap.style.cssText = input.style.cssText;
  const selector = document.createElement('div'); selector.className = 't-input-phonemask__select';
  selector.innerHTML = '<span class="t-input-phonemask__select-flag" aria-hidden="true"></span><span class="t-input-phonemask__select-triangle" aria-hidden="true"></span><span class="t-input-phonemask__select-code" aria-hidden="true"></span>';
  const select = document.createElement('select'); select.className = 'dd-country-select';
  select.setAttribute('aria-label', partner(name) ? 'Страна телефона партнёра' : 'Страна телефона');
  const entries = Object.entries(phoneCountries).map(([iso,country])=>{const region=regions.of(iso.toUpperCase());return {iso,country,title:!region||region===iso.toUpperCase()?country.n:region};}).sort((a,b)=>a.title.localeCompare(b.title,'ru'));
  for (const {iso,country,title} of entries) { const option = document.createElement('option'); option.value=iso; option.textContent=`${title} (${country.c})`; select.append(option); }
  select.value='ru'; selector.append(select);
  const result = document.createElement('input'); result.type='hidden'; result.name=name;
  input.before(wrap); wrap.append(selector,input,result);
  input.name=`dd-phone-${name}`; input.className='t-input t-input-phonemask';
  input.autocomplete=`${partner(name) ? 'section-partner' : 'section-main'} tel-national`;
  input.inputMode='tel'; input.style.border='0'; input.style.backgroundColor='transparent';
  input.setAttribute('aria-label',partner(name) ? 'Телефон партнёра' : 'Телефон');
  const sync = () => {
    const parts=phoneParts(input.value,select.value);
    if (parts.iso !== select.value || input.value.trim().startsWith('+')) { select.value=parts.iso; input.value=parts.national; }
    const country=phoneCountries[select.value];
    selector.querySelector('[data-phonemask-flag],.t-input-phonemask__select-flag').dataset.phonemaskFlag=select.value;
    selector.querySelector('.t-input-phonemask__select-code').textContent=country.c;
    input.placeholder = country.m.startsWith(country.c) ? country.m.slice(country.c.length).trim() : 'Номер телефона';
    result.value=internationalPhone(input.value,select.value);
  };
  input.addEventListener('input',sync); input.addEventListener('change',sync);
  select.addEventListener('change',()=>{sync(); input.dispatchEvent(new Event('input',{bubbles:true}));});
  sync();
}

function initCalendar(input,form) {
  const name=input.name, group=input.closest('[data-field-name]');
  const icon=group.querySelector('.t-datepicker__icon');
  const toggle=document.createElement('button'); toggle.type='button'; toggle.className='t-datepicker__icon t-datepicker__icon_bbonly dd-date-toggle';
  toggle.setAttribute('aria-label',partner(name) ? 'Календарь даты рождения партнёра' : 'Календарь даты рождения');
  toggle.setAttribute('aria-haspopup','dialog'); toggle.setAttribute('aria-expanded','false');
  icon.removeAttribute('class'); icon.removeAttribute('style'); icon.setAttribute('aria-hidden','true'); icon.removeAttribute('role'); icon.replaceWith(toggle); toggle.append(icon);
  const hint=document.createElement('span'); hint.className='dd-visually-hidden'; hint.id=`dd-date-hint-${name}`; hint.textContent='Формат даты: ДД.ММ.ГГГГ. Календарь открывается кнопкой или сочетанием Alt и стрелки вниз.';
  group.append(hint); input.setAttribute('aria-describedby',[input.getAttribute('aria-describedby'),hint.id].filter(Boolean).join(' '));
  input.inputMode='numeric'; input.autocomplete=`${partner(name) ? 'section-partner' : 'section-main'} bday`;
  const popup=document.createElement('div'); popup.className='t_datepicker__inner dd-calendar'; popup.id=`dd-calendar-${name}`; popup.hidden=true;
  popup.setAttribute('role','dialog'); popup.setAttribute('aria-label',partner(name) ? 'Дата рождения партнёра' : 'Дата рождения');
  toggle.setAttribute('aria-controls',popup.id); document.body.append(popup);
  popup.dataset.ddSmooth='paint'; smoothCorners(popup);
  const header=document.createElement('div'); header.className='t_datepicker__header';
  header.dataset.ddSmooth='paint'; smoothCorners(header);
  let cursor=new Date(), selected='';
  function position() {
    const r=input.getBoundingClientRect(), p=popup.getBoundingClientRect();
    popup.style.left=Math.max(8,Math.min(r.left,innerWidth-p.width-8))+scrollX+'px';
    popup.style.top=(r.bottom+p.height+12<innerHeight ? r.bottom+6 : Math.max(8,r.top-p.height-6))+scrollY+'px';
  }
  function close(returnFocus=false) { popup.hidden=true; toggle.setAttribute('aria-expanded','false'); if(returnFocus) toggle.focus({preventScroll:true}); }
  function focusDay() {
    const cell=popup.querySelector('[data-day][tabindex="0"]');
    if(!cell)return;
    cell.focus({preventScroll:true});
    const grid=popup.querySelector('.dd-calendar-grid'), bounds=cell.getBoundingClientRect(), viewport=grid.getBoundingClientRect();
    if(bounds.left<viewport.left+4)grid.scrollLeft-=viewport.left+4-bounds.left;
    else if(bounds.right>viewport.right-4)grid.scrollLeft+=bounds.right-viewport.right+4;
  }
  function open(moveFocus=true) {
    form.dispatchEvent(new CustomEvent('dd-close-calendars'));
    const value=normaliseBirthday(input.value);
    if (validBirthday(value)) { const [d,m,y]=value.split('.').map(Number); cursor=new Date(y,m-1,d); selected=stamp(cursor); } else { cursor=new Date(); selected=''; }
    popup.hidden=false; toggle.setAttribute('aria-expanded','true'); render(); position();
    if(moveFocus) focusDay();
  }
  function render(moveFocus=false) {
    const year=cursor.getFullYear(),month=cursor.getMonth(),day=cursor.getDate();
    popup.replaceChildren();
    header.replaceChildren();
    for(const [direction,label] of [[-1,'Предыдущий месяц'],[1,'Следующий месяц']]) {
      const button=document.createElement('button'); button.type='button'; button.className='t_datepicker__arrow t_datepicker__arrow_'+(direction<0?'prev':'next'); button.setAttribute('aria-label',label);
      button.disabled=direction<0 ? year===1900&&month===0 : year===new Date().getFullYear()&&month>=new Date().getMonth();
      button.addEventListener('click',()=>{
        cursor=calendarMove(cursor,direction<0?'PageUp':'PageDown');
        if(cursor>new Date())cursor=new Date();
        render();
        const arrow=popup.querySelector(direction<0?'.t_datepicker__arrow_prev':'.t_datepicker__arrow_next');
        (arrow.disabled?popup.querySelector('.t_datepicker__select_month'):arrow).focus();
      }); header.append(button);
    }
    for(const type of ['month','year']) {
      const label=document.createElement('div'); label.className=`t_datepicker__label t_datepicker__label_${type}`;
      const text=document.createElement('span'); text.textContent=type==='month'?months[month]:year; text.setAttribute('aria-live','polite');
      const select=document.createElement('select'); select.className=`t_datepicker__select t_datepicker__select_${type}`; select.setAttribute('aria-label',type==='month'?'Месяц':'Год');
      const values=type==='month'?months:Array.from({length:new Date().getFullYear()-1899},(_,i)=>1900+i);
      values.forEach((value,i)=>{ const option=document.createElement('option'); option.value=type==='month'?i:value; option.textContent=value; option.disabled=type==='month'&&year===new Date().getFullYear()&&i>new Date().getMonth(); select.append(option); });
      select.value=type==='month'?month:year;
      select.addEventListener('change',()=>{ const y=type==='year'?Number(select.value):year; let m=type==='month'?Number(select.value):month; if(y===new Date().getFullYear())m=Math.min(m,new Date().getMonth()); cursor=new Date(y,m,Math.min(day,new Date(y,m+1,0).getDate()));if(cursor>new Date())cursor=new Date();render(); popup.querySelector(`.t_datepicker__select_${type}`).focus(); });
      label.append(text,select); header.append(label);
    }
    popup.append(header);
    const table=document.createElement('table'); table.className='t_datepicker__body'; table.setAttribute('role','grid'); table.setAttribute('aria-label',`${months[month]} ${year}`);
    const thead=document.createElement('thead'), tr=document.createElement('tr');
    days.forEach((name,index)=>{const th=document.createElement('th'); th.className='t_datepicker__week-day'; th.scope='col'; th.setAttribute('abbr',name); th.textContent=shortDays[index]; tr.append(th);}); thead.append(tr); table.append(thead);
    const body=document.createElement('tbody'),first=new Date(year,month,1), offset=(first.getDay()+6)%7;
    const count=Math.ceil((offset+new Date(year,month+1,0).getDate())/7)*7;
    for(let i=0;i<count;i++) {
      if(i%7===0) body.append(document.createElement('tr'));
      const date=new Date(year,month,1-offset+i),value=stamp(date),cell=document.createElement('td');
      cell.className='t_datepicker__day-cell '+(date.getMonth()===month?'t_datepicker__current-month':date<first?'t_datepicker__previous-month':'t_datepicker__next-month');
      const chosen=value===selected; cell.classList.toggle('t_datepicker__selected-day',chosen); cell.setAttribute('aria-selected',String(chosen));
      const button=document.createElement('button'); button.type='button'; button.className='dd-calendar-day'; button.dataset.day=value; button.tabIndex=value===stamp(cursor)?0:-1; button.textContent=date.getDate(); button.setAttribute('aria-label',dateLabel.format(date));
      button.disabled=date.getFullYear()<1900||date>new Date();
      button.addEventListener('click',()=>{ input.value=new Intl.DateTimeFormat('ru',{day:'2-digit',month:'2-digit',year:'numeric'}).format(date); input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})); close(true); });
      cell.append(button); body.lastChild.append(cell);
    }
    table.append(body);
    const grid=document.createElement('div'); grid.className='dd-calendar-grid'; grid.append(table); popup.append(grid);
    if(moveFocus) focusDay();
  }
  toggle.addEventListener('click',()=>popup.hidden?open():close());
  input.addEventListener('click',()=>{if(popup.hidden)open(false);});
  input.addEventListener('blur',()=>{const value=normaliseBirthday(input.value); if(value!==input.value){input.value=value; input.dispatchEvent(new Event('input',{bubbles:true}));}});
  input.addEventListener('keydown',event=>{if(event.altKey&&event.key==='ArrowDown'){event.preventDefault();open();}else if(event.key==='Escape'&&!popup.hidden){event.preventDefault();close();}});
  popup.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);return;}
    if(event.key==='Tab') {
      const controls=focusable(popup),index=controls.indexOf(document.activeElement);
      if((event.shiftKey&&index===0)||(!event.shiftKey&&index===controls.length-1)) {
        event.preventDefault();close();const controls=focusable(form),index=controls.indexOf(toggle);(event.shiftKey?toggle:controls[index+1])?.focus();
      }
      return;
    }
    const cell=event.target.closest('[data-day]');
    if(!cell || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key)) return;
    event.preventDefault();const next=calendarMove(parseStamp(cell.dataset.day),event.key,event.shiftKey);
    if(next.getFullYear()<1900||next>new Date()) return;
    cursor=next;render(true);position();
  });
  document.addEventListener('pointerdown',event=>{if(!popup.hidden&&!popup.contains(event.target)&&!group.contains(event.target))close();});
  form.addEventListener('focusin',event=>{if(!popup.hidden&&!group.contains(event.target))close();});
  form.addEventListener('dd-close-calendars',()=>close());
  window.addEventListener('resize',()=>{if(!popup.hidden)position();});
}
