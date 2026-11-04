
    (()=>{
      'use strict';
      const room=document.getElementById('room-price');
      const food=document.getElementById('food-price');
      const shiga=document.getElementById('shiga-choice');
      const form=document.getElementById('budget-form');
      const money=n=>'¥'+Math.round(n).toLocaleString('zh-CN');
      const setText=(id,value)=>{document.getElementById(id).textContent=value;};
      const setLink=(id,label,url)=>{const a=document.getElementById(id);a.textContent=label;a.href=url;};
      function update(){
        const roomValue=Number(room.value),foodValue=Number(food.value),isShiga=shiga.checked;
        const lodging=roomValue*8/2,meals=foodValue*9,snow=isShiga?300:150;
        const total=lodging+meals+1100+snow+250;
        setText('room-output',money(roomValue));setText('food-output',money(foodValue));
        setText('lodging-total',money(lodging));setText('food-total',money(meals));
        setText('snow-budget-total',money(snow));setText('per-person-total',money(total));setText('two-person-total',money(total*2));
        setText('snow-budget-label',isShiga?'志贺高原往返巴士':'野泽温泉往返交通');
        if(isShiga){
          setText('snow-day-title','志贺高原，把一天留给高原雪景');
          setText('snow-day-intro','替换野泽温泉，不增加一个目的地；当天返回长野酒店。');
          setText('snow-day-meta','住长野 · 急行巴士约80分钟站到站，含酒店步行与等车需留更多时间');
          setText('snow-day-description','乘长野站东口出发的志贺高原急行，到山之站方向看高原雪景。非滑雪观光区域、设施开放与额外收费，出发前按官网确认。');
          setText('snow-day-cost','新季直达急行往返6,000日元/人，预算约300元。这里只含巴士，不含缆车、滑雪、租赁或体验；往返班次以官方冬季时刻为准。');
          setLink('snow-day-link','志贺高原官方信息','https://www.shigakogen.gr.jp/news/6402.html');
          setLink('snow-transport-link','26–27冬季巴士表','https://www.shigakogen.gr.jp/manage/wp-content/uploads/2026/11/26-27-EXP_Timetables.pdf');
          setLink('snow-map-link','山之站位置','https://www.google.com/maps/search/?api=1&query=Shiga+Kogen+Yamanoeki');
        }else{
          setText('snow-day-title','野泽温泉，把一天留给雪镇');
          setText('snow-day-intro','雪中的温泉街、屋顶和山景。当天往返，行李留在酒店。');
          const meta=document.getElementById('snow-day-meta');meta.textContent='住长野 · 单程按1.5–2小时规划 ';
          const pending=document.createElement('span');pending.className='pending';pending.textContent='冬季接驳待核';meta.appendChild(pending);
          setText('snow-day-description','普通铁路到饭山站，转野泽温泉 Liner。到村里后散步、吃午饭，按当天开放情况去日影区域看雪，不默认买滑雪全日票。');
          setText('snow-day-cost','交通预留3,000日元/人往返。现价参考为铁路610日元 + Liner 600日元单程；2026–27冬季巴士时刻与出行日期票价仍需核定，含等车单程约1.5–2小时。');
          setLink('snow-day-link','野泽冬季散步指南','https://nozawakanko.jp/course/course-918/');
          setLink('snow-transport-link','Liner最新时刻','https://nozawaonsen.info/nozawa-onsen-liner/');
          setLink('snow-map-link','雪区位置','https://www.google.com/maps/search/?api=1&query=Nozawa+Onsen+Village');
        }
      }
      form.addEventListener('input',update);
      form.addEventListener('reset',()=>requestAnimationFrame(update));
      update();
      const printButton=document.getElementById('print-button');printButton.hidden=false;printButton.addEventListener('click',()=>window.print());
      let printStates=[];
      window.addEventListener('beforeprint',()=>{printStates=Array.from(document.querySelectorAll('details')).map(el=>({el,open:el.open}));printStates.forEach(({el})=>el.open=true);});
      window.addEventListener('afterprint',()=>{printStates.forEach(({el,open})=>el.open=open);});
      const zoom=document.getElementById('map-zoom'),dialog=document.getElementById('map-dialog');
      if(typeof dialog.showModal==='function'){
        zoom.hidden=false;zoom.addEventListener('click',()=>{
          const body=document.getElementById('dialog-body');
          if(!body.firstElementChild){const img=document.createElement('img');img.src=document.getElementById('region-map').src;img.alt='长野市、饭山与野泽温泉的区域位置图';body.appendChild(img);}
          dialog.showModal();
        });
        document.getElementById('map-close').addEventListener('click',()=>dialog.close());
        dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
      }
    })();
  