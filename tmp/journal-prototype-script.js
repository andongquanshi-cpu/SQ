
(() => {
  const root = document.getElementById('tj-prototype');
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => [...root.querySelectorAll(s)];
  const city = $('#tj-city-photo').content.textContent.trim();
  const snow = $('#tj-snow-photo').content.textContent.trim();
  const money = v => '¥' + (v / 100).toLocaleString('zh-CN', {minimumFractionDigits:2, maximumFractionDigits:2});
  const escape = text => String(text).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const defaults = {screen:'home',day:3,layout:'postcard',photo:'snow',title:'在雪里走得很慢',text:'没有赶路，也没有目的。只是和你一起，把冬天走成了回忆。',ticket:true,sticker:'出走日',showAA:false};
  let state = {...defaults};
  let entries = [{title:'把城市的黄昏装进口袋',text:'拐进一条没做攻略的小路，发现了一家很喜欢的小店。\n今天最好的安排，是没有把行程排满。',author:'同伴',day:'第 2 天',layout:'ticket',photo:'city',ticket:true,sticker:'好天气'}];
  let expenses = [{title:'两晚住宿',cents:50000,payer:'me',split:'equal'},{title:'一起吃饭',cents:30000,payer:'partner',split:'equal'},{title:'同伴的纪念品',cents:10000,payer:'partner',split:'partner'}];
  const plans = {1:[['抵达','去住处放下行李','不接长途，先安顿下来'],['晚上','附近吃一顿晚饭','边吃边商量明天的安排']],2:[['10:00','逛街，寻找小店','留一点没有计划的时间'],['16:30','在城市里等黄昏','遇到喜欢的风景就停下来']],3:[['09:00','一起吃早餐','出发前确认当天的天气'],['14:00','午后沿着小街慢慢走','车站附近集合，轻装出发'],['18:00','找一家热乎的小店','顺便把今天的照片收进手账']]};
  const done = new Set();
  function save(){
    const summary={style:'固定模板拼贴手账',screen:state.screen,template:state.layout,sticker:state.sticker,hasTicket:state.ticket};
    const privateContent={...state,entries:entries.slice(0,8),expenses:expenses.slice(0,15),done:[...done]};
    if(window.openai?.setWidgetState) window.openai.setWidgetState({modelContent:summary,privateContent}).catch(()=>{});
  }
  function restore(saved){
    const p = saved?.privateContent;
    if(!p || typeof p !== 'object') return;
    for(const key of Object.keys(defaults)) if(typeof p[key]===typeof defaults[key]) state[key]=p[key];
    if(!['home','itinerary','journal','editor','ledger'].includes(state.screen)) state.screen='home';
    if(!['postcard','ticket','double'].includes(state.layout)) state.layout='postcard';
    if(![1,2,3].includes(state.day)) state.day=3;
    if(Array.isArray(p.entries)) entries=p.entries.filter(e=>e && typeof e.title==='string' && typeof e.text==='string').slice(0,8);
    if(Array.isArray(p.expenses)) expenses=p.expenses.filter(e=>e && Number.isInteger(e.cents) && e.cents>0 && ['me','partner'].includes(e.payer) && ['equal','me','partner'].includes(e.split)).slice(0,15);
    done.clear(); if(Array.isArray(p.done)) p.done.forEach(k=>done.add(k));
  }
  function icons(){if(window.lucide) window.lucide.createIcons({attrs:{width:18,height:18}});}
  function page(e){
    const main = e.photo==='city' ? city : snow;
    const other = e.photo==='city' ? snow : city;
    const photos=e.layout==='double'?`<div class="tj-double-photos"><img src="${main}" alt="旅行照片示例"><img src="${other}" alt="另一张旅行照片示例"></div>`:`<img src="${main}" alt="旅行照片示例">`;
    const day=String(e.day || '3').match(/\d+/)?.[0] || '3';
    const ticket=e.ticket?`<div class="tj-scrap-ticket"><span>一起出发<br>OUR LITTLE JOURNEY</span><b>DAY ${day.padStart(2,'0')}</b><span>两位同行<br>纪念票根</span></div>`:'';
    return `<article class="tj-paper-page" data-layout="${escape(e.layout)}">${photos}${e.sticker!=='不加贴纸'?`<span class="tj-stamp">${escape(e.sticker)}</span>`:''}<h2>${escape(e.title||'今天的小事')}</h2><p>${escape(e.text)}</p>${ticket}</article>`;
  }
  function renderEditor(){
    $('.tj-edit-preview').innerHTML=page(state);
    $$('[data-template]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.template===state.layout)));
    $$('[data-sticker]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sticker===state.sticker)));
  }
  function renderJournal(){
    $('.tj-journal-feed').innerHTML=entries.map(e=>`<div class="tj-entry-meta"><span>${escape(e.day)} · ${escape(e.author)}的一页</span><span>共同可见 · 示例</span></div>${page(e)}`).join('')+'<p class="tj-entry-end">不同的人，留下同一段旅程。</p>';
  }
  function renderPlan(){
    $$('[data-day]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.day)===state.day)));
    $('.tj-day-content').innerHTML=plans[state.day].map((p,i)=>{const key=state.day+'-'+i;return `<div class="tj-plan-row ${done.has(key)?'is-done':''}"><span class="tj-plan-time">${p[0]}</span><div><b>${p[1]}</b><p>${p[2]}</p></div><label class="tj-plan-check-label"><input class="tj-plan-check" type="checkbox" data-task="${key}" ${done.has(key)?'checked':''} aria-label="标记${p[1]}已完成"></label></div>`;}).join('');
    $$('[data-task]').forEach(c=>c.addEventListener('change',()=>{if(c.checked)done.add(c.dataset.task);else done.delete(c.dataset.task);renderPlan();save();}));
  }
  function renderLedger(){
    const total=expenses.reduce((a,e)=>a+e.cents,0); let paidMe=0,owedMe=0,paidPartner=0,owedPartner=0;
    expenses.forEach(e=>{let myShare=e.split==='me'?e.cents:e.split==='partner'?0:Math.floor(e.cents/2)+(e.cents%2 && e.payer==='me'?1:0); if(e.payer==='me')paidMe+=e.cents;else paidPartner+=e.cents;owedMe+=myShare;owedPartner+=e.cents-myShare;});
    const net=paidMe-owedMe;
    $('#tj-total').textContent=money(total);
    $('#tj-aa-result').innerHTML=`<strong>${net===0?'这份示例账本已平衡':net>0?'同伴应给我 '+money(net):'我应给同伴 '+money(-net)}</strong>我垫付 ${money(paidMe)} · 承担 ${money(owedMe)}<br>同伴垫付 ${money(paidPartner)} · 承担 ${money(owedPartner)}`;
    $('#tj-aa-result').hidden=!state.showAA;$('#tj-aa-toggle').setAttribute('aria-expanded',String(state.showAA));
    $('#tj-expense-list').innerHTML=expenses.map(e=>`<div class="tj-expense-row"><div><b>${escape(e.title)}</b><small>${e.payer==='me'?'我':'同伴'}先付 · ${e.split==='equal'?'两人均摊':e.split==='me'?'只由我承担':'只由同伴承担'}</small></div><strong>${money(e.cents)}</strong></div>`).join('');
  }
  function render(){
    $$('[data-screen]').forEach(s=>s.hidden=s.dataset.screen!==state.screen);
    const current=state.screen==='editor'?'journal':state.screen;
    $$('.tj-nav button').forEach(b=>{if(b.dataset.go===current)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    $('#tj-entry-title').value=state.title;$('#tj-entry-text').value=state.text;$('#tj-ticket-toggle').checked=state.ticket;
    renderEditor();renderJournal();renderPlan();renderLedger();icons();
  }
  function go(screen){state.screen=screen;$('#tj-toast').hidden=true;render();save();}
  $$('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));
  $$('[data-open-editor]').forEach(b=>b.addEventListener('click',()=>go('editor')));
  $$('[data-template]').forEach(b=>b.addEventListener('click',()=>{state.layout=b.dataset.template;renderEditor();save();}));
  $$('[data-sticker]').forEach(b=>b.addEventListener('click',()=>{state.sticker=b.dataset.sticker;renderEditor();save();}));
  $$('[data-day]').forEach(b=>b.addEventListener('click',()=>{state.day=Number(b.dataset.day);renderPlan();save();}));
  $('#tj-entry-title').addEventListener('input',e=>{state.title=e.target.value;renderEditor();save();});
  $('#tj-entry-text').addEventListener('input',e=>{state.text=e.target.value;renderEditor();save();});
  $('#tj-ticket-toggle').addEventListener('change',e=>{state.ticket=e.target.checked;renderEditor();save();});
  $('#tj-photo-switch').addEventListener('click',()=>{state.photo=state.photo==='snow'?'city':'snow';renderEditor();save();});
  $('#tj-publish').addEventListener('click',()=>{entries.unshift({...state,author:'我',day:'第 3 天'});entries=entries.slice(0,8);go('journal');$('#tj-toast').textContent='已加入这次预览的旅行本，尚未同步到另一部手机。';$('#tj-toast').hidden=false;});
  $('#tj-aa-toggle').addEventListener('click',()=>{state.showAA=!state.showAA;renderLedger();save();});
  $('#tj-add-expense').addEventListener('click',()=>{$('#tj-expense-form').hidden=false;$('#tj-expense-form input[name="title"]').focus();});
  $('#tj-cancel-expense').addEventListener('click',()=>{$('#tj-expense-form').hidden=true;});
  function recordExpense(){const form=$('#tj-expense-form');const data=new FormData(form);const amount=Number(data.get('amount'));const title=String(data.get('title')).trim();if(!title||!Number.isFinite(amount)||amount<=0||amount>100000||!form.checkValidity()){$('#tj-expense-error').textContent='请填写费用名称和有效金额，金额保留到分。';$('#tj-expense-error').hidden=false;return;}expenses.unshift({title,cents:Math.round(amount*100),payer:String(data.get('payer')),split:String(data.get('split'))});$('#tj-expense-error').hidden=true;form.reset();form.hidden=true;renderLedger();save();}
  $('#tj-save-expense').addEventListener('click',recordExpense);
  $('#tj-expense-form').addEventListener('submit',e=>{e.preventDefault();recordExpense();});
  $$('#tj-expense-form input').forEach(input=>input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();recordExpense();}}));
  restore(window.openai?.widgetState);render();
  window.addEventListener('openai:set_globals',e=>{if(e.detail?.globals?.widgetState){restore(e.detail.globals.widgetState);render();}});
  if(window.Tweak){const design={showSticker:true};const tweak=new Tweak({container:root.querySelector('.tj-phone'),onChange:()=>{state.sticker=design.showSticker?'出走日':'不加贴纸';renderEditor();save();}});tweak.addToggle(design,'showSticker',{label:'显示纪念贴纸'});}
})();
