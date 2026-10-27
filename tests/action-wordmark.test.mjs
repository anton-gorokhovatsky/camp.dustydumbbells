import test from 'node:test';
import assert from 'node:assert/strict';
import { enhanceAction } from '../site/action-wordmark.js';
import { createApplicationStatus } from '../site/application-status.js';

function element(text = '') {
  const node = {dataset:{},children:[],attributes:{},hidden:false,disabled:false};
  let own = text;
  Object.defineProperty(node,'textContent',{
    get:()=>own + node.children.map(child=>child.textContent).join(''),
    set:value=>{own=String(value);node.children=[];},
  });
  node.append=(...children)=>node.children.push(...children);
  node.replaceChildren=(...children)=>{own='';node.children=[...children];};
  node.setAttribute=(name,value)=>{node.attributes[name]=value;};
  node.getAttribute=name=>node.attributes[name]??null;
  node.focus=()=>{node.focused=true;};
  return node;
}

for (const letteringFirst of [false,true]) test(`submit state preserves one label when lettering initializes ${letteringFirst?'before':'after'} status`,()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>element()};
  try {
    const label=element('Отправить заявку'),button=element(),parent=element(),form=element();
    button.parentElement=parent;
    button.querySelector=()=>label;
    form.querySelector=()=>button;
    if(letteringFirst)enhanceAction(button);
    const status=createApplicationStatus(form);
    if(!letteringFirst)enhanceAction(button);
    status.show('error','Попробуйте ещё раз.');
    assert.equal(button.getAttribute('aria-label'),'Отправить ещё раз');
    assert.equal(label.dataset.ddLabel,'Отправить ещё раз');
    assert.equal(label.children.length,1);
    assert.equal(label.children[0].getAttribute('aria-hidden'),'true');
    status.show();
    assert.equal(button.getAttribute('aria-label'),'Отправить заявку');
    assert.equal(label.dataset.ddLabel,'Отправить заявку');
    status.show('pending','Отправляем заявку…');
    assert.equal(button.hidden,true);
    assert.equal(parent.children[0].textContent,'Отправляем заявку…');
    status.show('success','Заявка отправлена');
    assert.equal(button.hidden,true);
    assert.equal(parent.children[0].textContent,'Заявка отправлена');
  } finally {globalThis.document=previous;}
});
