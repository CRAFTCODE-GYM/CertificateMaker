/* ==========================================================
   賞状メーカー  —  js/app.js
   台紙スキャン＋表彰者CSV → 賞状印刷用PDF（すべてブラウザ内で処理）
   ========================================================== */
"use strict";
/* ============================================================
   定数
   ============================================================ */
const MM_PT = 25.4/72;
const FONTS = [
  {id:'mincho',   label:'明朝（Noto Serif JP）', css:'"Noto Serif JP","Yu Mincho","Hiragino Mincho ProN",serif'},
  {id:'shippori', label:'明朝（しっぽり明朝）',   css:'"Shippori Mincho","Yu Mincho",serif'},
  {id:'brush',    label:'毛筆（Yuji Syuku）',     css:'"Yuji Syuku","Yu Mincho",serif'},
  {id:'gothic',   label:'ゴシック（Noto Sans JP）',css:'"Noto Sans JP","Hiragino Sans",sans-serif'},
  {id:'sysmin',   label:'端末の明朝',             css:'"Yu Mincho","YuMincho","Hiragino Mincho ProN","MS PMincho",serif'},
  {id:'sysgo',    label:'端末のゴシック',         css:'"Hiragino Sans","Yu Gothic",Meiryo,sans-serif'},
];
const fontCss = id => (FONTS.find(f=>f.id===id)||FONTS[0]).css;

const PAPERS = [
  {id:'A4', label:'A4（210×297）', w:210, h:297},
  {id:'B4', label:'B4（257×364）', w:257, h:364},
  {id:'B5', label:'B5（182×257）', w:182, h:257},
  {id:'A5', label:'A5（148×210）', w:148, h:210},
  {id:'A3', label:'A3（297×420）', w:297, h:420},
  {id:'shichi', label:'賞状用紙 尺七（273×394）', w:273, h:394},
  {id:'custom', label:'任意サイズ', w:210, h:297},
];

const RECORD_TAGS = ['氏名','ふりがな','所属','都道府県','クラス','種目','分類','部門','順位','順位漢','得点','ゼッケン','性別','学年'];
const SAMPLE = {氏名:'体操 太郎', ふりがな:'たいそう たろう', 所属:'〇〇体操クラブ', 都道府県:'大阪', クラス:'U-12クラス',
  種目:'ゆか', 分類:'種目別', 部門:'ゆか', 順位:'1', 順位漢:'一', 得点:'12.500', ゼッケン:'1', 性別:'男子', 学年:'小6'};

const MAP_KEYS = [
  ['氏名',    ['選手名','氏名','名前','氏名(漢字)','name']],
  ['ふりがな',['選手名読み','ふりがな','フリガナ','かな','よみ']],
  ['所属',    ['所属名','所属','団体名','チーム','クラブ']],
  ['都道府県',['所属(その他)','都道府県','県']],
  ['種目',    ['種目']],
  ['分類',    ['分類','種別']],
  ['クラス',  ['クラス名','クラス','部門','区分']],
  ['順位',    ['順位','位']],
  ['得点',    ['得点','点数','合計']],
  ['ゼッケン',['ゼッケン番号','ゼッケン','番号']],
  ['性別',    ['性別']],
  ['学年',    ['年齢/学年','学年','年齢']],
];

// 「追加」のひな型
const QUICK_ADD = [
  {g:'差込（CSVの値が入る）', key:'name_dono', name:'氏名＋殿', text:'{氏名}　殿', size:28, weight:700, fit:'shrink', maxW:120, ls:0.1},
  {g:'差込（CSVの値が入る）', key:'name',      name:'氏名',     text:'{氏名}',     size:28, weight:700, fit:'shrink', maxW:120, ls:0.1},
  {g:'差込（CSVの値が入る）', key:'kana',      name:'ふりがな', text:'{ふりがな}', size:10, fit:'shrink', maxW:120},
  {g:'差込（CSVの値が入る）', key:'affil',     name:'所属',     text:'{所属}',     size:14, fit:'shrink', maxW:120},
  {g:'差込（CSVの値が入る）', key:'event',     name:'種目・部門', text:'{部門}',   size:16, fit:'shrink', maxW:80},
  {g:'差込（CSVの値が入る）', key:'rank',      name:'順位',     text:'第{順位}位', size:18, fit:'none', maxW:60},
  {g:'差込（CSVの値が入る）', key:'rankk',     name:'順位（漢数字）', text:'第{順位漢}位', size:18, fit:'none', maxW:60},
  {g:'差込（CSVの値が入る）', key:'award',     name:'受賞名（クラス・部門・順位）', text:'{クラス}　{部門}　第{順位}位', size:16, fit:'shrink', maxW:140},
  {g:'差込（CSVの値が入る）', key:'score',     name:'得点',     text:'{得点}点',   size:12, fit:'none', maxW:60},
  {g:'印字（全員に同じ文字）', key:'round',    name:'第◯回の数字', text:'00', size:36, weight:700, fit:'none', maxW:30, select:true},
  {g:'印字（全員に同じ文字）', key:'year',     name:'年の数字', text:'0', size:24, weight:700, fit:'none', maxW:20, select:true},
  {g:'印字（全員に同じ文字）', key:'month',    name:'月の数字', text:'0', size:24, weight:700, fit:'none', maxW:20, select:true},
  {g:'印字（全員に同じ文字）', key:'day',      name:'日の数字', text:'0', size:24, weight:700, fit:'none', maxW:20, select:true},
  {g:'印字（全員に同じ文字）', key:'meet',     name:'大会名',   text:'大会名', size:18, fit:'shrink', maxW:150, select:true},
  {g:'印字（全員に同じ文字）', key:'free',     name:'自由な文字', text:'文字', size:14, fit:'shrink', maxW:150, select:true},
];

function makeEl(q, over){
  return Object.assign({
    id:'el'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),
    name:q.name, text:q.text, x:105, y:148, size:q.size||14, font:'mincho', weight:q.weight||500,
    ls:q.ls??0.05, lh:1.5, align:'center', fit:q.fit||'shrink', maxW:q.maxW||120,
    vert:false, color:'#111111', on:true
  }, over||{});
}

/* ============================================================
   設定
   ============================================================ */
function defaultSettings(){
  return {
    version:2,
    paper:{preset:'A4', w:210, h:297, orient:'portrait'},
    mode:'overlay',
    offset:{x:0,y:0},
    dpi:300,
    fileName:'賞状',
    bg:{opacity:60, x:0, y:0, w:null, h:null, dataUrl:null},
    elements:[ makeEl(QUICK_ADD[0], {id:'name', x:105, y:82}) ],
  };
}

let S = defaultSettings();
let RECORDS = [], HEADERS = [], MAP = {}, FILES = [];
let selEl = 'name';
let curIdx = 0;
let zoom = 1, fitZoom = 1;
let bgImage = null;
let boxes = [];
let filterState = {};

/* ============================================================
   ユーティリティ
   ============================================================ */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const esc = s => String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

let toastTimer=null;
function toast(msg, kind){
  const t=$('#toast'); t.textContent=msg; t.className='toast on'+(kind==='err'?' err':'');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('on'), kind==='err'?7000:3800);
}
function setStatus(msg, kind){ const n=$('#status'); n.textContent=msg||''; n.className='status'+(kind==='err'?' err':''); }

function kanjiNum(n){
  n = parseInt(n,10);
  if(!isFinite(n)||n<0) return '';
  const d='〇一二三四五六七八九';
  if(n<10) return d[n];
  if(n<100){ const t=Math.floor(n/10), o=n%10; return (t>1?d[t]:'')+'十'+(o?d[o]:''); }
  if(n<1000){ const h=Math.floor(n/100), r=n%100; return (h>1?d[h]:'')+'百'+(r?kanjiNum(r):''); }
  return String(n);
}

/* ---- CSV ---- */
function decodeBuf(buf){
  try{ return new TextDecoder('utf-8',{fatal:true}).decode(buf).replace(/^﻿/,''); }
  catch(e){ try{ return new TextDecoder('shift_jis').decode(buf); }catch(e2){ return new TextDecoder().decode(buf); } }
}
function parseCSV(text){
  const rows=[]; let row=[], cell='', q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(q){
      if(c==='"'){ if(text[i+1]==='"'){cell+='"';i++;} else q=false; }
      else cell+=c;
    }else{
      if(c==='"') q=true;
      else if(c===','){ row.push(cell); cell=''; }
      else if(c==='\n'){ row.push(cell); rows.push(row); row=[]; cell=''; }
      else if(c==='\r'){}
      else cell+=c;
    }
  }
  if(cell!==''||row.length){ row.push(cell); rows.push(row); }
  if(!rows.length) return {headers:[],rows:[]};
  const headers = rows[0].map(h=>h.trim());
  const out=[];
  for(let i=1;i<rows.length;i++){
    if(rows[i].every(c=>c.trim()==='')) continue;
    const o={}; headers.forEach((h,j)=>o[h]=(rows[i][j]??'').trim());
    out.push(o);
  }
  return {headers, rows:out};
}
function autoMap(){
  MAP = {};
  for(const [key, cands] of MAP_KEYS){
    const hit = cands.find(c=>HEADERS.includes(c)) || HEADERS.find(h=>cands.some(c=>h.includes(c)));
    if(hit) MAP[key]=hit;
  }
}
function field(rec,key){
  if(key==='順位漢') return kanjiNum(field(rec,'順位'));
  if(key==='部門'){ return field(rec,'種目') || field(rec,'分類'); }
  const col = MAP[key];
  if(col && rec.raw[col]!=null) return rec.raw[col];
  if(rec.raw[key]!=null) return rec.raw[key];
  return '';
}
function resolve(tpl, rec){
  return String(tpl||'').replace(/\{([^}]+)\}/g, (m,k)=>{
    k=k.trim();
    if(rec) return field(rec,k);
    return SAMPLE[k] ?? k;
  });
}
const hasTag = tpl => /\{[^}]+\}/.test(String(tpl||''));

/* ============================================================
   描画エンジン（プレビューとPDFで共通）
   ============================================================ */
const VERT_ROTATE = new Set(['ー','－','—','―','〜','～','…','‥','(',')','（','）','「','」','『','』','【','】','〈','〉','《','》','[',']','｛','｝','{','}','ｰ']);
const NO_LINE_HEAD = new Set(['、','。','，','．',')','）','」','』','】','〉','》','!','！','?','？','ゝ','ヽ','ー','々','ゃ','ゅ','ょ','ッ','ャ','ュ','ョ','っ','：','；',',','.']);

async function ensureFont(el, text){
  try{ await document.fonts.load(`${el.weight} 24px ${fontCss(el.font)}`, text||'あ'); }catch(e){}
}
function measure(ctx, str, ls){
  let w=0; for(const ch of str) w += ctx.measureText(ch).width;
  const n=[...str].length;
  return w + (n>1 ? ls*(n-1) : 0);
}
function wrapLines(ctx, text, ls, maxPx){
  const out=[];
  for(const para of String(text).split('\n')){
    if(!maxPx || maxPx<=0){ out.push(para); continue; }
    let line='';
    for(const ch of para){
      const test = line+ch;
      if(line && measure(ctx,test,ls) > maxPx){
        if(NO_LINE_HEAD.has(ch)){ out.push(test); line=''; }
        else { out.push(line); line=ch; }
      } else line = test;
    }
    out.push(line);
  }
  return out;
}
function drawChars(ctx, str, x, y, ls, vert, fontPx){
  if(!vert){
    let cx=x;
    for(const ch of str){ ctx.fillText(ch,cx,y); cx += ctx.measureText(ch).width + ls; }
    return;
  }
  let cy=y;
  for(const ch of str){
    const w = ctx.measureText(ch).width;
    if(VERT_ROTATE.has(ch)){
      ctx.save(); ctx.translate(x, cy - fontPx*0.36); ctx.rotate(Math.PI/2);
      ctx.fillText(ch, -w/2, fontPx*0.36); ctx.restore();
    }else ctx.fillText(ch, x - w/2, cy);
    cy += fontPx + ls;
  }
}

/** 1枚ぶんを描画。戻り値は各項目のあたり判定（px） */
function renderSheet(ctx, rec, opts){
  const o = Object.assign({ppm:4, bg:false, bgAlpha:1, grid:false, frames:false, guide:false}, opts||{});
  const ppm=o.ppm, W=S.paper.w, H=S.paper.h;
  ctx.save();
  ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,W*ppm,H*ppm);

  if(o.bg && bgImage){
    ctx.globalAlpha = o.bgAlpha;
    ctx.drawImage(bgImage, (S.bg.x||0)*ppm, (S.bg.y||0)*ppm, (S.bg.w||W)*ppm, (S.bg.h||H)*ppm);
    ctx.globalAlpha = 1;
  }
  if(o.grid){
    ctx.lineWidth=1;
    for(let x=5;x<W;x+=5){ ctx.strokeStyle= x%10? 'rgba(40,90,160,.08)':'rgba(40,90,160,.2)'; ctx.beginPath(); ctx.moveTo(x*ppm,0); ctx.lineTo(x*ppm,H*ppm); ctx.stroke(); }
    for(let y=5;y<H;y+=5){ ctx.strokeStyle= y%10? 'rgba(40,90,160,.08)':'rgba(40,90,160,.2)'; ctx.beginPath(); ctx.moveTo(0,y*ppm); ctx.lineTo(W*ppm,y*ppm); ctx.stroke(); }
  }
  if(o.guide){
    ctx.strokeStyle='#888'; ctx.lineWidth=Math.max(1,ppm*0.1);
    ctx.setLineDash([ppm*2,ppm*2]);
    ctx.beginPath(); ctx.moveTo(W*ppm/2,0); ctx.lineTo(W*ppm/2,H*ppm); ctx.moveTo(0,H*ppm/2); ctx.lineTo(W*ppm,H*ppm/2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='#555'; ctx.font=`${2.6*ppm}px sans-serif`; ctx.textBaseline='middle';
    for(let y=10;y<H;y+=10){ const long=y%50===0; ctx.beginPath(); ctx.moveTo(0,y*ppm); ctx.lineTo((long?8:4)*ppm,y*ppm); ctx.moveTo(W*ppm,y*ppm); ctx.lineTo((W-(long?8:4))*ppm,y*ppm); ctx.stroke(); if(y%20===0) ctx.fillText(String(y),9*ppm,y*ppm); }
    ctx.textBaseline='top';
    for(let x=10;x<W;x+=10){ const long=x%50===0; ctx.beginPath(); ctx.moveTo(x*ppm,0); ctx.lineTo(x*ppm,(long?8:4)*ppm); ctx.moveTo(x*ppm,H*ppm); ctx.lineTo(x*ppm,(H-(long?8:4))*ppm); ctx.stroke(); if(x%20===0) ctx.fillText(String(x),x*ppm+ppm*0.6,9*ppm); }
  }

  const hits=[];
  const ox=(S.offset.x||0)*ppm, oy=(S.offset.y||0)*ppm;
  for(const el of S.elements){
    if(!el.on) continue;
    const text = resolve(el.text, rec);
    if(!text.trim()) continue;

    let fontPx = el.size*MM_PT*ppm;
    const ls0 = el.ls*fontPx;
    ctx.textBaseline='alphabetic';
    ctx.font = `${el.weight} ${fontPx}px ${fontCss(el.font)}`;
    ctx.fillStyle = el.color;

    const maxPx = (el.maxW||0)*ppm;
    let lines = (el.fit==='wrap') ? wrapLines(ctx, text, ls0, maxPx) : String(text).split('\n');
    if(el.fit==='shrink' && maxPx>0 && !el.vert){
      const longest = Math.max(...lines.map(l=>measure(ctx,l,ls0)));
      if(longest>maxPx){
        fontPx *= clamp(maxPx/longest, .2, 1);
        ctx.font = `${el.weight} ${fontPx}px ${fontCss(el.font)}`;
      }
    }
    const ls = el.ls*fontPx, lh = fontPx*el.lh;
    const ax = el.x*ppm + ox, ay = el.y*ppm + oy;

    let bx0=Infinity,by0=Infinity,bx1=-Infinity,by1=-Infinity;
    if(!el.vert){
      lines.forEach((ln,i)=>{
        const w = measure(ctx,ln,ls);
        let sx = ax;
        if(el.align==='center') sx = ax - w/2; else if(el.align==='right') sx = ax - w;
        const by = ay + fontPx*0.86 + i*lh;
        drawChars(ctx, ln, sx, by, ls, false, fontPx);
        bx0=Math.min(bx0,sx); bx1=Math.max(bx1,sx+w);
        by0=Math.min(by0,by-fontPx*0.86); by1=Math.max(by1,by+fontPx*0.14);
      });
    }else{
      lines.forEach((ln,i)=>{
        const n=[...ln].length;
        const h = n*fontPx + (n>1?ls*(n-1):0);
        const cx = ax - i*lh;
        let sy = ay + fontPx*0.86;
        if(el.align==='center') sy = ay - h/2 + fontPx*0.86; else if(el.align==='right') sy = ay - h + fontPx*0.86;
        drawChars(ctx, ln, cx, sy, ls, true, fontPx);
        bx0=Math.min(bx0,cx-fontPx*0.55); bx1=Math.max(bx1,cx+fontPx*0.55);
        by0=Math.min(by0,sy-fontPx*0.86); by1=Math.max(by1,sy-fontPx*0.86+h);
      });
    }
    hits.push({id:el.id, x0:bx0, y0:by0, x1:bx1, y1:by1});

    if(o.frames){
      const sel = el.id===selEl;
      ctx.save();
      ctx.strokeStyle = sel? '#0d6efd' : 'rgba(108,117,125,.75)';
      ctx.lineWidth = sel? Math.max(1.5,ppm*0.35) : 1;
      ctx.setLineDash(sel? [ppm*1.5,ppm*1.2] : [ppm*0.6,ppm*0.8]);
      const pad = ppm*0.8;
      ctx.strokeRect(bx0-pad, by0-pad, (bx1-bx0)+pad*2, (by1-by0)+pad*2);
      if(sel){
        // 基準点（X・Y が指す位置）
        ctx.setLineDash([]); ctx.beginPath();
        ctx.arc(ax, ay, ppm*0.9, 0, Math.PI*2); ctx.fillStyle='#0d6efd'; ctx.fill();
      }
      ctx.restore();
    }
  }
  ctx.restore();
  return hits;
}

/* ============================================================
   プレビュー
   ============================================================ */
const sheet = $('#sheet'), sctx = sheet.getContext('2d');
let renderPending=false;
function requestRender(){
  if(renderPending) return;
  renderPending=true;
  requestAnimationFrame(async()=>{ renderPending=false; await drawPreview(); });
}
async function drawPreview(){
  const list = selectedRecords();
  const rec = list[curIdx] || null;
  const dpr = Math.min(2, window.devicePixelRatio||1);
  const ppm = 3.2*zoom;
  sheet.width = Math.round(S.paper.w*ppm*dpr);
  sheet.height= Math.round(S.paper.h*ppm*dpr);
  sheet.style.width = (S.paper.w*ppm)+'px';
  sheet.style.height= (S.paper.h*ppm)+'px';
  sctx.setTransform(dpr,0,0,dpr,0,0);

  for(const el of S.elements){ if(el.on) await ensureFont(el, resolve(el.text,rec)); }
  boxes = renderSheet(sctx, rec, {
    ppm, bg:$('#showBg').checked, bgAlpha:(S.bg.opacity||60)/100,
    grid:$('#showGrid').checked, frames:$('#showFrame').checked
  }).map(b=>({id:b.id, x0:b.x0/ppm, y0:b.y0/ppm, x1:b.x1/ppm, y1:b.y1/ppm}));

  $('#recLabel').textContent = rec
    ? `${curIdx+1} / ${list.length}　${field(rec,'氏名')||'（氏名なし）'}`
    : (RECORDS.length? '選択中の賞状がありません' : '見本データで表示中');
  $('#zoomLabel').textContent = Math.round(zoom*100)+'%';
}
function fitToStage(){
  const wrap = document.querySelector('.canvaswrap');
  const z = Math.min((wrap.clientWidth-40)/(S.paper.w*3.2), (wrap.clientHeight-40)/(S.paper.h*3.2));
  zoom = clamp(z, .15, 4); fitZoom=zoom; requestRender();
}

/* ---- ドラッグで移動 ---- */
let drag=null;
function canvasMm(e){
  const r = sheet.getBoundingClientRect();
  return { x:(e.clientX-r.left)/r.width*S.paper.w, y:(e.clientY-r.top)/r.height*S.paper.h };
}
sheet.addEventListener('pointerdown', e=>{
  const m = canvasMm(e);
  const ox=S.offset.x||0, oy=S.offset.y||0;
  const hit = [...boxes].reverse().find(b=> m.x>=b.x0-2 && m.x<=b.x1+2 && m.y>=b.y0-2 && m.y<=b.y1+2);
  if(!hit) return;
  const el = S.elements.find(x=>x.id===hit.id); if(!el) return;
  selEl = el.id; syncElUI(); paintElLists();
  drag = {id:el.id, dx:m.x-(el.x+ox), dy:m.y-(el.y+oy)};
  sheet.setPointerCapture(e.pointerId); sheet.classList.add('dragging');
  sheet.focus?.();
  requestRender();
});
sheet.addEventListener('pointermove', e=>{
  if(!drag) return;
  const m = canvasMm(e);
  const el = S.elements.find(x=>x.id===drag.id); if(!el) return;
  let nx = m.x-drag.dx-(S.offset.x||0), ny = m.y-drag.dy-(S.offset.y||0);
  if($('#snap').checked){ nx=Math.round(nx); ny=Math.round(ny); }
  el.x = clamp(+nx.toFixed(1), -50, S.paper.w+50);
  el.y = clamp(+ny.toFixed(1), -50, S.paper.h+50);
  $('#elX').value=el.x; $('#elY').value=el.y;
  requestRender(); saveSession();
});
const endDrag = ()=>{ if(drag){ drag=null; sheet.classList.remove('dragging'); } };
sheet.addEventListener('pointerup', endDrag);
sheet.addEventListener('pointercancel', endDrag);

// 矢印キー：↑で上へ、↓で下へ
window.addEventListener('keydown', e=>{
  if(!e.key.startsWith('Arrow')) return;
  const t=e.target; if(t && /INPUT|TEXTAREA|SELECT|BUTTON/.test(t.tagName)) return;
  const el = S.elements.find(x=>x.id===selEl); if(!el) return;
  const step = e.shiftKey?5:0.5;
  if(e.key==='ArrowLeft') el.x-=step;
  if(e.key==='ArrowRight') el.x+=step;
  if(e.key==='ArrowUp') el.y-=step;
  if(e.key==='ArrowDown') el.y+=step;
  el.x=+el.x.toFixed(1); el.y=+el.y.toFixed(1);
  $('#elX').value=el.x; $('#elY').value=el.y;
  e.preventDefault(); requestRender(); saveSession();
});

/* ============================================================
   ステッパー（▲で上へ・▼で下へ、◀で左へ・▶で右へ）
   ============================================================ */
function nudge(input, d){
  const v=(parseFloat(input.value)||0)+d;
  input.value=+v.toFixed(2);
  input.dispatchEvent(new Event('input',{bubbles:true}));
}
function setupSteppers(){
  $$('.step').forEach(wrap=>{
    const input = wrap.querySelector('input');
    const vertical = wrap.dataset.axis==='y';
    const baseStep = ()=> parseFloat(input.step)||0.5;
    wrap.querySelectorAll('button').forEach(btn=>{
      let t1=null, t2=null;
      const go = ev => nudge(input, (+btn.dataset.d)*((ev&&ev.shiftKey)?5:baseStep()));
      const stop = ()=>{ clearTimeout(t1); clearInterval(t2); };
      btn.addEventListener('pointerdown', ev=>{
        ev.preventDefault(); go(ev);
        t1=setTimeout(()=>{ t2=setInterval(()=>go(ev),70); },380);
      });
      ['pointerup','pointerleave','pointercancel'].forEach(n=>btn.addEventListener(n,stop));
      btn.addEventListener('keydown', ev=>{ if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); go(ev); } });
    });
    // 数値欄でのキー操作も見た目の向きに合わせる
    input.addEventListener('keydown', ev=>{
      if(ev.key!=='ArrowUp' && ev.key!=='ArrowDown') return;
      ev.preventDefault();
      const s=(ev.shiftKey?5:baseStep());
      const up = ev.key==='ArrowUp';
      nudge(input, vertical ? (up?-s:s) : (up?s:-s));
    });
    input.addEventListener('wheel', ev=>{ if(document.activeElement===input) ev.preventDefault(); }, {passive:false});
  });
}

/* ============================================================
   ① 台紙
   ============================================================ */
function srcToImage(src){
  return new Promise(res=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=()=>res(null); im.src=src; });
}
let pdfjsReady=null;
function loadPdfJs(){
  if(window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if(pdfjsReady) return pdfjsReady;
  pdfjsReady = new Promise((res,rej)=>{
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload=()=>{ window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; res(window.pdfjsLib); };
    s.onerror=()=>{ pdfjsReady=null; rej(new Error('pdf.js')); };
    document.head.appendChild(s);
  });
  return pdfjsReady;
}
async function pdfToImage(file){
  const lib=await loadPdfJs();
  const pdf=await lib.getDocument({data:await file.arrayBuffer()}).promise;
  const page=await pdf.getPage(1);
  const v1=page.getViewport({scale:1});
  const scale = 3200/Math.max(v1.width,v1.height);
  const vp=page.getViewport({scale});
  const cv=document.createElement('canvas'); cv.width=Math.round(vp.width); cv.height=Math.round(vp.height);
  const cx=cv.getContext('2d'); cx.fillStyle='#fff'; cx.fillRect(0,0,cv.width,cv.height);
  await page.render({canvasContext:cx, viewport:vp}).promise;
  const blob = await new Promise(r=>cv.toBlob(r,'image/jpeg',0.92));
  return {blob, mm:{w:v1.width*MM_PT, h:v1.height*MM_PT}};
}
function downscaleDataUrl(img, maxSide){
  const s = Math.min(1, maxSide/Math.max(img.naturalWidth, img.naturalHeight));
  const cv=document.createElement('canvas');
  cv.width=Math.round(img.naturalWidth*s); cv.height=Math.round(img.naturalHeight*s);
  const cx=cv.getContext('2d'); cx.fillStyle='#fff'; cx.fillRect(0,0,cv.width,cv.height);
  cx.drawImage(img,0,0,cv.width,cv.height);
  return cv.toDataURL('image/jpeg',0.86);
}
function setPaper(w,h,preset,orient){
  S.paper.w=+w.toFixed(1); S.paper.h=+h.toFixed(1); S.paper.preset=preset; S.paper.orient=orient;
}
/** 画像の比率（PDFなら実寸）から用紙を決める */
function autoPaper(img, mm){
  const fmt = ()=>`${(PAPERS.find(p=>p.id===S.paper.preset)||{label:'任意'}).label.replace(/（.*/,'')}${S.paper.orient==='landscape'?'横':'縦'}`;
  S.bg.x=0; S.bg.y=0; S.bg.w=null; S.bg.h=null;
  if(mm){
    for(const p of PAPERS){ if(p.id==='custom') continue;
      for(const land of [false,true]){
        const w=land?p.h:p.w, h=land?p.w:p.h;
        if(Math.abs(w-mm.w)<3 && Math.abs(h-mm.h)<3){ setPaper(w,h,p.id,land?'landscape':'portrait'); return `PDFの寸法から ${fmt()} と判定しました。`; }
      }
    }
    setPaper(mm.w, mm.h, 'custom', mm.w>mm.h?'landscape':'portrait');
    return `PDFの寸法（${Math.round(mm.w)}×${Math.round(mm.h)}mm）に用紙を合わせました。`;
  }
  const r = img.naturalHeight/img.naturalWidth;
  const ratioOk = (w,h)=> Math.abs(h/w - r)/(h/w) < 0.012;
  // 今の用紙サイズのまま向きだけ合わせられるか
  const cur = PAPERS.find(p=>p.id===S.paper.preset);
  const base = (cur && cur.id!=='custom') ? cur : {id:'custom', w:Math.min(S.paper.w,S.paper.h), h:Math.max(S.paper.w,S.paper.h)};
  for(const land of [false,true]){
    const w=land?base.h:base.w, h=land?base.w:base.h;
    if(ratioOk(w,h)){ setPaper(w,h,base.id,land?'landscape':'portrait'); return `${fmt()} の台紙として配置しました。B4やA3など同じ形の別サイズなら ⑤ で用紙を変更してください。`; }
  }
  for(const p of PAPERS){ if(p.id==='custom') continue;
    for(const land of [false,true]){
      const w=land?p.h:p.w, h=land?p.w:p.h;
      if(ratioOk(w,h)){ setPaper(w,h,p.id,land?'landscape':'portrait'); return `${fmt()} の台紙として配置しました。サイズが違う場合は ⑤ で用紙を変更してください。`; }
    }
  }
  // 比率が合わない：用紙の幅に合わせ、縦横比は画像どおり
  if((r>1) !== (S.paper.h>S.paper.w)) setPaper(S.paper.h, S.paper.w, S.paper.preset, S.paper.orient==='portrait'?'landscape':'portrait');
  S.bg.w = S.paper.w; S.bg.h = +(S.paper.w*r).toFixed(1);
  return 'スキャン画像の縦横比が用紙と合わないため、幅をそろえて置きました。上端と高さで枠を合わせてください。';
}
async function loadBgFile(file){
  if(!file) return;
  let blob=file, mm=null;
  try{
    if(/pdf$/i.test(file.type) || /\.pdf$/i.test(file.name)){
      toast('PDFを画像に変換しています…');
      ({blob, mm} = await pdfToImage(file));
    }
  }catch(e){ toast('PDFを読み込めませんでした。JPGかPNGで読み込んでください。','err'); return; }
  const url = URL.createObjectURL(blob);
  const img = await srcToImage(url);
  if(!img){ toast('画像を読み込めませんでした。JPG・PNG・PDFを選んでください。','err'); return; }
  bgImage = img;
  const msg = autoPaper(img, mm);
  // 保存用に縮小した控え（PDFの「白紙に刷る」でも 300dpi 相当の画質を保つ大きさ）
  S.bg.dataUrl = downscaleDataUrl(img, 3000);
  syncGlobalUI(); paintBgInfo(msg); fitToStage(); saveSession(); markDone();
  toast('台紙を読み込みました。');
}
async function restoreBg(){
  bgImage=null;
  if(S.bg.dataUrl) bgImage = await srcToImage(S.bg.dataUrl);
  paintBgInfo(bgImage? '保存されていた台紙を表示しています。' : '');
  requestRender(); markDone();
}
function paintBgInfo(msg){
  const has = !!bgImage;
  $('#bgThumbWrap').hidden = !has;
  if(has){ $('#bgThumb').src = S.bg.dataUrl || bgImage.src; $('#bgStatus').textContent = msg||''; }
}
function syncBgUI(){
  $('#bgX').value=S.bg.x??0; $('#bgY').value=S.bg.y??0;
  $('#bgW').value=S.bg.w??''; $('#bgH').value=S.bg.h??'';
  $('#bgW').placeholder=S.paper.w; $('#bgH').placeholder=S.paper.h;
  $('#bgOpacity').value=S.bg.opacity??60;
}
const bgDrop=$('#bgDrop');
['dragenter','dragover'].forEach(ev=> bgDrop.addEventListener(ev, e=>{e.preventDefault(); e.stopPropagation(); bgDrop.classList.add('over');}));
['dragleave','drop'].forEach(ev=> bgDrop.addEventListener(ev, e=>{e.preventDefault(); bgDrop.classList.remove('over');}));
bgDrop.addEventListener('drop', e=>{ e.stopPropagation(); loadBgFile(e.dataTransfer.files[0]); });
bgDrop.addEventListener('click', ()=> $('#bgInput').click());
bgDrop.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); $('#bgInput').click(); } });
$('#bgInput').onchange = e=>{ loadBgFile(e.target.files[0]); e.target.value=''; };
$('#clearBg').onclick = ()=>{ bgImage=null; S.bg.dataUrl=null; paintBgInfo(); requestRender(); saveSession(); markDone(); };
$('#bgOpacity').oninput = ()=>{ S.bg.opacity=+$('#bgOpacity').value; requestRender(); saveSession(); };
['X','Y','W','H'].forEach(k=>{
  $('#bg'+k).addEventListener('input', ()=>{
    const v=$('#bg'+k).value, key=k.toLowerCase();
    S.bg[key] = (v==='') ? (key==='w'||key==='h'? null : 0) : +v;
    requestRender(); saveSession();
  });
});
$('#bgFull').onclick = ()=>{ S.bg.x=0; S.bg.y=0; S.bg.w=null; S.bg.h=null; syncBgUI(); requestRender(); saveSession(); };
$('#bgRatio').onclick = ()=>{
  if(!bgImage) return;
  const w = S.bg.w || S.paper.w;
  S.bg.w = w; S.bg.h = +(w*bgImage.naturalHeight/bgImage.naturalWidth).toFixed(1);
  syncBgUI(); requestRender(); saveSession();
};

/* ============================================================
   ② CSV
   ============================================================ */
async function addFiles(files){
  const csvs = [...files].filter(f=>/\.csv$/i.test(f.name));
  if(!csvs.length){ toast('CSVファイルが見つかりません。','err'); return; }
  let added=0;
  for(const f of csvs){
    const {headers, rows} = parseCSV(decodeBuf(await f.arrayBuffer()));
    if(!rows.length) continue;
    FILES.push({name:f.name, count:rows.length});
    headers.forEach(h=>{ if(h && !HEADERS.includes(h)) HEADERS.push(h); });
    rows.forEach(r=> RECORDS.push({raw:r, _on:true}));
    added+=rows.length;
  }
  autoMap();
  curIdx=0;
  paintAll(); markDone();
  toast(`${csvs.length}ファイル・${added}件を読み込みました（合計${RECORDS.length}件）。`);
}
async function entriesFromDrop(dt){
  const out=[];
  const readEntry = async (entry)=>{
    if(!entry) return;
    if(entry.isFile) await new Promise(res=> entry.file(f=>{ out.push(f); res(); }, res));
    else if(entry.isDirectory){
      const reader = entry.createReader();
      let batch;
      do{
        batch = await new Promise(res=> reader.readEntries(res, ()=>res([])));
        for(const e of batch) await readEntry(e);
      }while(batch.length);
    }
  };
  const items=[...(dt.items||[])];
  if(items.length && items[0].webkitGetAsEntry){
    const entries = items.map(it=>it.webkitGetAsEntry());
    for(const en of entries) await readEntry(en);
  }
  return out.length? out : [...(dt.files||[])];
}
const drop = $('#drop');
['dragenter','dragover'].forEach(ev=> drop.addEventListener(ev, e=>{e.preventDefault(); e.stopPropagation(); drop.classList.add('over');}));
['dragleave','drop'].forEach(ev=> drop.addEventListener(ev, e=>{e.preventDefault(); drop.classList.remove('over');}));
drop.addEventListener('drop', async e=>{ e.stopPropagation(); addFiles(await entriesFromDrop(e.dataTransfer)); });
drop.addEventListener('click', ()=> $('#fileInput').click());
drop.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); $('#fileInput').click(); } });
$('#pickFiles').onclick = ()=> $('#fileInput').click();
$('#pickDir').onclick   = ()=> $('#dirInput').click();
$('#fileInput').onchange = e=>{ addFiles(e.target.files); e.target.value=''; };
$('#dirInput').onchange  = e=>{ addFiles(e.target.files); e.target.value=''; };
$('#clearData').onclick = ()=>{ RECORDS=[]; HEADERS=[]; FILES=[]; MAP={}; filterState={}; curIdx=0; paintAll(); markDone(); };

// ステージへのドロップ：画像なら台紙、CSVなら名簿
document.addEventListener('dragover', e=>e.preventDefault());
document.addEventListener('drop', async e=>{
  e.preventDefault();
  const files = await entriesFromDrop(e.dataTransfer);
  const img = files.find(f=>/^image\//.test(f.type) || /\.(pdf|jpe?g|png|webp)$/i.test(f.name));
  const csv = files.filter(f=>/\.csv$/i.test(f.name));
  if(img) loadBgFile(img);
  if(csv.length) addFiles(csv);
});

/* ---- 絞り込み ---- */
function filterCols(){ return ['分類','種目','クラス','性別'].filter(k=>MAP[k]); }
function distinct(key){ const s=new Set(); RECORDS.forEach(r=> s.add(field(r,key)||'（空欄）')); return [...s]; }
function passFilter(rec){
  for(const k of filterCols()){
    const set = filterState[k];
    if(!set) continue;
    if(!set.has(field(rec,k)||'（空欄）')) return false;
  }
  const rm = parseInt($('#rankMax').value,10);
  if(isFinite(rm)){ const r=parseInt(field(rec,'順位'),10); if(isFinite(r) && r>rm) return false; }
  return true;
}
function filteredRecords(){ return RECORDS.filter(passFilter); }
function selectedRecords(){
  const list = filteredRecords().filter(r=>r._on);
  const by = $('#sortBy').value;
  const num = v=>{ const n=parseInt(v,10); return isFinite(n)?n:9999; };
  const cmp = (a,b,k)=> (field(a,k)||'').localeCompare(field(b,k)||'','ja');
  if(by==='group') list.sort((a,b)=> cmp(a,b,'クラス') || cmp(a,b,'部門') || num(field(a,'順位'))-num(field(b,'順位')));
  if(by==='rank')  list.sort((a,b)=> num(field(a,'順位'))-num(field(b,'順位')) || cmp(a,b,'クラス'));
  if(by==='name')  list.sort((a,b)=> (field(a,'ふりがな')||field(a,'氏名')).localeCompare(field(b,'ふりがな')||field(b,'氏名'),'ja'));
  return list;
}

/* ============================================================
   画面の描き直し
   ============================================================ */
function paintFiles(){
  $('#fileList').innerHTML = FILES.length
    ? FILES.map(f=>`・${esc(f.name)}（${f.count}件）`).join('<br>')
    : 'まだ読み込んでいません。読み込むまでは見本データで表示します。';
}
function paintMap(){
  const g=$('#mapGrid');
  if(!HEADERS.length){ g.innerHTML='<div class="hint" style="grid-column:1/-1">CSVを読み込むとここに表示されます。</div>'; return; }
  g.innerHTML = MAP_KEYS.map(([k])=>`
    <label><span class="fieldlabel">{${k}}</span>
      <select data-map="${k}">
        <option value="">—</option>
        ${HEADERS.map(h=>`<option value="${esc(h)}" ${MAP[k]===h?'selected':''}>${esc(h)}</option>`).join('')}
      </select></label>`).join('');
  g.querySelectorAll('select').forEach(s=> s.onchange = ()=>{
    MAP[s.dataset.map] = s.value; paintFilters(); paintTable(); requestRender();
  });
}
function paintFilters(){
  const c=$('#filters');
  const cols = filterCols();
  if(!RECORDS.length || !cols.length){ c.innerHTML='<div class="hint">CSVを読み込むと絞り込みが使えます。</div>'; return; }
  c.innerHTML = cols.map(k=>{
    const vals = distinct(k);
    return `<div style="margin-bottom:8px"><div class="fieldlabel">${k}</div><div class="row wrap">`+
      vals.map(v=>{
        const on = !filterState[k] || filterState[k].has(v);
        return `<label class="check"><input type="checkbox" data-f="${esc(k)}" value="${esc(v)}" ${on?'checked':''}><span>${esc(v)}</span></label>`;
      }).join('')+`</div></div>`;
  }).join('');
  c.querySelectorAll('input[data-f]').forEach(cb=> cb.onchange=()=>{
    const k=cb.dataset.f;
    const all=[...c.querySelectorAll('input[data-f]')].filter(b=>b.dataset.f===k);
    filterState[k]=new Set(all.filter(b=>b.checked).map(b=>b.value));
    curIdx=0; paintTable(); requestRender();
  });
}
function paintTable(){
  const t=$('#recTable');
  const list = filteredRecords();
  if(!list.length){ t.innerHTML=`<tbody><tr><td class="hint">${RECORDS.length?'条件に合う行がありません。':'CSVを読み込むと一覧が出ます。'}</td></tr></tbody>`; paintCounts(); return; }
  const cur = selectedRecords()[curIdx];
  t.innerHTML = `<thead><tr><th style="width:26px"></th><th>氏名</th><th>所属</th><th>部門</th><th>順位</th></tr></thead><tbody>`+
    list.map(r=>`<tr data-i="${RECORDS.indexOf(r)}" class="${r._on?'':'off'}" ${r===cur?'aria-current="true"':''}>
      <td><input type="checkbox" ${r._on?'checked':''} aria-label="印刷する"></td>
      <td>${esc(field(r,'氏名'))}</td><td>${esc(field(r,'所属'))}</td>
      <td>${esc(field(r,'部門'))}</td><td class="num">${esc(field(r,'順位'))}</td></tr>`).join('')+`</tbody>`;
  t.querySelectorAll('tbody tr').forEach(tr=>{
    const rec = RECORDS[+tr.dataset.i];
    tr.querySelector('input').onclick = e=>{ e.stopPropagation(); rec._on=e.target.checked; tr.classList.toggle('off',!rec._on); paintCounts(); requestRender(); };
    tr.onclick = ()=>{ const idx=selectedRecords().indexOf(rec); if(idx>=0){ curIdx=idx; paintTable(); requestRender(); } };
  });
  paintCounts();
}
function paintCounts(){
  const n = selectedRecords().length;
  $('#cntSel').textContent = n; $('#cntSel2').textContent = n;
  $('#cntAll').textContent = RECORDS.length;
}
function kindMark(el){
  return hasTag(el.text) ? `<span class="mark sashi">差込</span>` : `<span class="mark inji">印字</span>`;
}
function paintElLists(){
  const html = S.elements.length ? S.elements.map(el=>`
    <button class="elrow" data-el="${el.id}" ${el.id===selEl?'aria-current="true"':''}>
      ${kindMark(el)}
      <span class="nm" style="${el.on?'':'opacity:.45;text-decoration:line-through'}">${esc(el.name)}</span>
      <span class="tx">${esc(el.text.replace(/\n/g,' '))}</span>
    </button>`).join('') : `<div class="emptylist">項目がありません。上の「追加」から入れてください。</div>`;
  ['#elList','#elList2'].forEach(sel=>{
    const box=$(sel); box.innerHTML=html;
    box.querySelectorAll('.elrow').forEach(b=> b.onclick=()=>{ selEl=b.dataset.el; syncElUI(); paintElLists(); requestRender(); });
  });
}
function syncElUI(){
  const el = S.elements.find(x=>x.id===selEl) || S.elements[0];
  const has = !!el;
  $('#elEditor').hidden = !has;
  $$('[data-pane="layout"] section.block').slice(1).forEach(s=> s.hidden = !has && !s.querySelector('#offX'));
  if(!has){ $('#layTitle').textContent='配置'; return; }
  selEl = el.id;
  $('#elTextTitle').textContent = `内容 — ${el.name}`;
  $('#layTitle').textContent = `配置 — ${el.name}`;
  $('#elName').value=el.name; $('#elText').value=el.text;
  $('#elX').value=el.x; $('#elY').value=el.y; $('#elSize').value=el.size;
  $('#elFont').value=el.font; $('#elWeight').value=String(el.weight);
  $('#elLs').value=el.ls; $('#elLh').value=el.lh; $('#elMaxW').value=el.maxW;
  $('#elAlign').value=el.align; $('#elFit').value=el.fit; $('#elVert').value=el.vert?'1':'0';
  $('#elColor').value=el.color; $('#elEnabled').checked=el.on;
}
function paintAll(){ paintFiles(); paintMap(); paintFilters(); paintTable(); paintElLists(); syncElUI(); paintCounts(); requestRender(); }

/* ============================================================
   ③ 項目
   ============================================================ */
function bindEl(sel, key, cast){
  const node=$(sel);
  const handler = ()=>{
    const el = S.elements.find(x=>x.id===selEl); if(!el) return;
    let v = node.type==='checkbox' ? node.checked : node.value;
    if(cast) v = cast(v);
    el[key]=v;
    if(key==='name'||key==='text'||key==='on'){
      paintElLists();
      $('#elTextTitle').textContent = `内容 — ${el.name}`; $('#layTitle').textContent = `配置 — ${el.name}`;
    }
    requestRender(); saveSession();
  };
  node.addEventListener('input', handler);
  if(node.tagName==='SELECT' || node.type==='checkbox' || node.type==='color') node.addEventListener('change', handler);
}
const num = v=> (v===''||isNaN(+v)? 0 : +v);
bindEl('#elName','name'); bindEl('#elText','text'); bindEl('#elEnabled','on');
bindEl('#elX','x',num); bindEl('#elY','y',num); bindEl('#elSize','size',v=>Math.max(4,num(v)));
bindEl('#elFont','font'); bindEl('#elWeight','weight',num);
bindEl('#elLs','ls',num); bindEl('#elLh','lh',v=>Math.max(1,num(v))); bindEl('#elMaxW','maxW',num);
bindEl('#elAlign','align'); bindEl('#elFit','fit');
bindEl('#elVert','vert', v=> v==='1'); bindEl('#elColor','color');

$('#elFont').innerHTML = FONTS.map(f=>`<option value="${f.id}">${f.label}</option>`).join('');
$('#paperPreset').innerHTML = PAPERS.map(p=>`<option value="${p.id}">${p.label}</option>`).join('');
{
  const groups=[...new Set(QUICK_ADD.map(q=>q.g))];
  $('#quickAdd').innerHTML = groups.map(g=>`<optgroup label="${g}">`+
    QUICK_ADD.filter(q=>q.g===g).map(q=>`<option value="${q.key}">${q.name}</option>`).join('')+`</optgroup>`).join('');
}
$('#tagBtns').innerHTML = RECORD_TAGS.map(t=>`<button type="button" class="tiny" data-tag="${t}">{${t}}</button>`).join('');
$('#tagBtns').querySelectorAll('button').forEach(b=> b.onclick=()=>{
  const ta=$('#elText'); const tag='{'+b.dataset.tag+'}';
  const s=ta.selectionStart??ta.value.length, e=ta.selectionEnd??s;
  ta.value = ta.value.slice(0,s)+tag+ta.value.slice(e);
  ta.focus(); ta.selectionStart=ta.selectionEnd=s+tag.length;
  ta.dispatchEvent(new Event('input'));
});

$('#addEl').onclick = ()=>{
  const q = QUICK_ADD.find(x=>x.key===$('#quickAdd').value) || QUICK_ADD[0];
  // 直前の項目の少し下に置く（重なり防止）
  const last = S.elements.find(x=>x.id===selEl);
  const y = last ? clamp(last.y+15, 5, S.paper.h-10) : S.paper.h/2;
  const el = makeEl(q, {x:+(S.paper.w/2).toFixed(1), y:+y.toFixed(1)});
  S.elements.push(el);
  selEl=el.id; paintElLists(); syncElUI(); requestRender(); saveSession(); markDone();
  if(q.select){ const ta=$('#elText'); ta.focus(); ta.select(); }
  toast(`「${q.name}」を追加しました。プレビューでドラッグして位置を合わせます。`);
};
$('#dupEl').onclick = ()=>{
  const src = S.elements.find(x=>x.id===selEl); if(!src) return;
  const el = Object.assign({}, src, {id:'el'+Date.now().toString(36), name:src.name+'（複製）', x:+(src.x+10).toFixed(1)});
  S.elements.splice(S.elements.indexOf(src)+1, 0, el);
  selEl=el.id; paintElLists(); syncElUI(); requestRender(); saveSession();
};
$('#delEl').onclick = ()=>{
  const i=S.elements.findIndex(x=>x.id===selEl); if(i<0) return;
  S.elements.splice(i,1);
  selEl = S.elements[Math.max(0,i-1)]?.id || null;
  paintElLists(); syncElUI(); requestRender(); saveSession(); markDone();
};

/* ============================================================
   ④ 位置合わせ（全体補正）
   ============================================================ */
$('#offX').addEventListener('input', ()=>{ S.offset.x=num($('#offX').value); requestRender(); saveSession(); });
$('#offY').addEventListener('input', ()=>{ S.offset.y=num($('#offY').value); requestRender(); saveSession(); });

/* ============================================================
   ⑤ 用紙・出力
   ============================================================ */
function applyPaper(){
  const p = PAPERS.find(x=>x.id===$('#paperPreset').value) || PAPERS[0];
  const land = $('#orient').value==='landscape';
  if(p.id!=='custom') setPaper(land?p.h:p.w, land?p.w:p.h, p.id, land?'landscape':'portrait');
  else setPaper(+$('#paperW').value||210, +$('#paperH').value||297, 'custom', $('#orient').value);
  $('#paperW').value=S.paper.w; $('#paperH').value=S.paper.h;
  syncBgUI(); fitToStage(); saveSession();
}
$('#paperPreset').onchange=applyPaper;
$('#orient').onchange=()=>{
  if($('#paperPreset').value==='custom'){ const w=S.paper.w; $('#paperW').value=S.paper.h; $('#paperH').value=w; }
  applyPaper();
};
$('#paperW').oninput=()=>{ $('#paperPreset').value='custom'; applyPaper(); };
$('#paperH').oninput=()=>{ $('#paperPreset').value='custom'; applyPaper(); };
$$('input[name=mode]').forEach(r=> r.onchange=()=>{ S.mode=r.value; saveSession(); });
$('#dpi').onchange = ()=>{ S.dpi=+$('#dpi').value; saveSession(); };
$('#fileName').oninput = ()=>{ S.fileName=$('#fileName').value; saveSession(); };
$('#rankMax').oninput = ()=>{ curIdx=0; paintTable(); requestRender(); };
$('#sortBy').onchange = ()=>{ curIdx=0; paintTable(); requestRender(); };
$('#selAll').onclick = ()=>{ filteredRecords().forEach(r=>r._on=true); paintTable(); requestRender(); };
$('#selNone').onclick= ()=>{ filteredRecords().forEach(r=>r._on=false); paintTable(); requestRender(); };

$('#showBg').onchange = requestRender;
$('#showGrid').onchange = requestRender;
$('#showFrame').onchange = requestRender;
$('#prevRec').onclick = ()=>{ curIdx=Math.max(0,curIdx-1); paintTable(); requestRender(); };
$('#nextRec').onclick = ()=>{ curIdx=Math.min(Math.max(0,selectedRecords().length-1), curIdx+1); paintTable(); requestRender(); };
$('#zoomIn').onclick = ()=>{ zoom=clamp(zoom*1.15,.15,4); requestRender(); };
$('#zoomOut').onclick= ()=>{ zoom=clamp(zoom/1.15,.15,4); requestRender(); };
$('#zoomFit').onclick= fitToStage;
window.addEventListener('resize', ()=>{ if(Math.abs(zoom-fitZoom)<.01) fitToStage(); });

function safeName(s){ return String(s||'賞状').replace(/[\\\/:*?"<>|]/g,'_').slice(0,80); }

async function makePdf(records, opts={}){
  if(!window.jspdf){ setStatus('PDFの部品が読み込めませんでした。通信環境を確認して開き直してください。','err'); toast('PDFの部品が読み込めませんでした。','err'); return; }
  if(!records.length && !opts.guide){
    const m = RECORDS.length? '印刷する賞状が選ばれていません。② で選択してください。' : 'CSVがまだ読み込まれていません。② で読み込んでください。';
    setStatus(m,'err'); toast(m,'err'); return;
  }
  if(S.mode==='full' && !bgImage && !opts.guide){ toast('台紙の画像がないため、追加した項目だけを出力します。','err'); }
  const {jsPDF} = window.jspdf;
  const W=S.paper.w, H=S.paper.h;
  const ppm = (+S.dpi)/25.4;
  const cv = document.createElement('canvas');
  cv.width = Math.round(W*ppm); cv.height = Math.round(H*ppm);
  const ctx = cv.getContext('2d');
  const orient = W>H?'landscape':'portrait';
  const pdf = new jsPDF({unit:'mm', format:[W,H], orientation:orient, compress:true});

  const prog=$('#prog'), bar=prog.querySelector('i');
  prog.hidden=false; bar.style.width='0%';
  const total = opts.guide? 1 : records.length;
  const full = S.mode==='full' && !opts.guide;
  try{
    for(let i=0;i<total;i++){
      const rec = opts.guide? (records[0]||null) : records[i];
      for(const el of S.elements){ if(el.on) await ensureFont(el, resolve(el.text,rec)); }
      renderSheet(ctx, rec, {ppm, bg:full, bgAlpha:1, guide:!!opts.guide});
      if(i>0) pdf.addPage([W,H], orient);
      pdf.addImage(cv.toDataURL(full?'image/jpeg':'image/png', 0.92), full?'JPEG':'PNG', 0, 0, W, H, undefined, 'FAST');
      bar.style.width = Math.round((i+1)/total*100)+'%';
      setStatus(`作成中… ${i+1} / ${total}`);
      if(i%3===2) await new Promise(r=>setTimeout(r));
    }
    const name = safeName((S.fileName||'賞状')+(opts.guide?'_位置合わせ':'')+(opts.test?'_テスト':''))+'.pdf';
    const ok = await deliver(pdf.output('blob'), name);
    if(ok){ setStatus(`${total}ページのPDFを作成しました（${name}）。`); toast(`PDFを作成しました（${total}ページ）。`); }
  }catch(err){
    console.error(err);
    setStatus('作成に失敗しました：'+(err?.message||err),'err'); toast('PDFの作成に失敗しました。','err');
  }finally{
    setTimeout(()=>{ prog.hidden=true; }, 800);
  }
}
async function deliver(blob, filename){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 60000);
  return true;
}
const testOne = ()=>{ const l=selectedRecords(); makePdf(l.length?[l[curIdx]||l[0]]:[], {test:true}); };
$('#btnPdf').onclick = $('#btnPdf2').onclick = ()=> makePdf(selectedRecords());
$('#btnTest').onclick = $('#btnTest2').onclick = testOne;
$('#btnGuide').onclick = ()=> makePdf(selectedRecords(), {guide:true});

/* ============================================================
   ⑥ 保存
   ============================================================ */
/* 保存先：ブラウザの IndexedDB（台紙画像を含むため localStorage では容量不足）
   使えない環境では localStorage に台紙なしで保存する */
const LS_SESSION='shojo.session.v2';
const IDB = (()=>{
  let dbp=null;
  function open(){
    if(dbp) return dbp;
    dbp = new Promise((res,rej)=>{
      if(!('indexedDB' in window)) return rej(new Error('IndexedDB unavailable'));
      const r = indexedDB.open('shojo-maker', 1);
      r.onupgradeneeded = ()=>{
        const d=r.result;
        if(!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
        if(!d.objectStoreNames.contains('presets')) d.createObjectStore('presets',{keyPath:'id'});
      };
      r.onsuccess = ()=>res(r.result);
      r.onerror = ()=>rej(r.error);
    });
    dbp.catch(()=>{ dbp=null; });
    return dbp;
  }
  async function run(store, mode, fn){
    const d = await open();
    return new Promise((res,rej)=>{
      const t = d.transaction(store, mode);
      const req = fn(t.objectStore(store));
      t.oncomplete = ()=>res(req ? req.result : undefined);
      t.onerror = ()=>rej(t.error);
      t.onabort = ()=>rej(t.error);
    });
  }
  return {
    get: k   => run('kv','readonly', s=>s.get(k)),
    set: (k,v)=> run('kv','readwrite', s=>s.put(v,k)),
    all: ()  => run('presets','readonly', s=>s.getAll()),
    put: p   => run('presets','readwrite', s=>s.put(p)),
    del: id  => run('presets','readwrite', s=>s.delete(id)),
  };
})();
let idbOk = true;

const snapshot = ()=> JSON.parse(JSON.stringify(S));
function applySettings(obj){
  const d=defaultSettings();
  const o = obj||{};
  S = Object.assign(d, o, {
    version:2,
    paper:Object.assign({},d.paper,o.paper||{}),
    offset:Object.assign({},d.offset,o.offset||{}),
    bg:Object.assign({},d.bg,o.bg||{}),
    elements: Array.isArray(o.elements) ? o.elements.filter(e=>!e.pre).map(e=>{ const c={...e}; delete c.pre; return c; }) : d.elements,
  });
  delete S.bg.assetId;
  if(S.mode!=='full') S.mode='overlay';
  selEl = S.elements[0]?.id || null;
  syncGlobalUI(); paintAll(); fitToStage();
  restoreBg();
}
function syncGlobalUI(){
  $$('input[name=mode]').forEach(r=> r.checked = r.value===S.mode);
  $('#paperPreset').value=S.paper.preset; $('#orient').value=S.paper.orient;
  $('#paperW').value=S.paper.w; $('#paperH').value=S.paper.h;
  $('#offX').value=S.offset.x; $('#offY').value=S.offset.y;
  $('#dpi').value=String(S.dpi); $('#fileName').value=S.fileName;
  syncBgUI();
}
let saveTimer=null;
function saveSession(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(async()=>{
    try{ await IDB.set('session', snapshot()); }
    catch(e){
      idbOk=false;
      try{ const c=snapshot(); c.bg.dataUrl=null; localStorage.setItem(LS_SESSION, JSON.stringify(c)); }catch(e2){}
    }
  }, 500);
}
async function loadSession(){
  try{ const v = await IDB.get('session'); if(v) return v; }catch(e){ idbOk=false; }
  try{ return JSON.parse(localStorage.getItem(LS_SESSION)||'null'); }catch(e){ return null; }
}
async function initStore(){
  $('#storeInfo').innerHTML = idbOk
    ? '設定は<b>このパソコンのこのブラウザ</b>の中に保存されます（台紙の画像も含む）。サーバーには何も送られません。<br>別のパソコンや別の担当者と使うときは、上の「書き出す（JSON）」で受け渡してください。<br>名簿のCSVはどこにも保存しません。ブラウザの閲覧履歴やサイトデータを消すと、保存した設定も消えます。'
    : 'このブラウザでは保存領域が使えないため、設定は台紙の画像を除いて一時的に保存されます。プライベートウィンドウを使っている場合は通常のウィンドウで開いてください。<br>版面を残すときは「書き出す（JSON）」を使ってください。';
  await paintPresets();
}
async function listPresets(){
  try{ const a = await IDB.all(); return a.sort((x,y)=>(y.updatedAt||'').localeCompare(x.updatedAt||'')); }
  catch(e){ return []; }
}
function presetBody(){ return {settings:snapshot(), note:''}; }
async function putPreset(p){ await IDB.put(p); return ''; }
async function delPreset(id){ await IDB.del(id); }
async function paintPresets(){
  const list = await listPresets();
  const box=$('#presetList');
  if(!list.length){ box.innerHTML='<div class="hint">まだありません。</div>'; return; }
  box.innerHTML = list.map(p=>{
    const bg = p.settings?.bg && p.settings.bg.dataUrl;
    const n = p.settings?.elements?.length||0;
    return `<div class="presetrow" data-id="${esc(p.id)}">
      <span class="nm">${esc(p.name)}<span class="hint">　${bg?'台紙あり・':''}${n}項目</span></span>
      <span class="dt">${esc((p.updatedAt||'').slice(5,16).replace('T',' '))}</span>
      <button class="tiny" data-act="load">開く</button>
      <button class="tiny" data-act="over">上書き</button>
      <button class="tiny ghost" data-act="del" aria-label="削除">削除</button>
    </div>`;}).join('');
  box.querySelectorAll('.presetrow').forEach(row=>{
    const p = list.find(x=>x.id===row.dataset.id);
    row.querySelectorAll('button').forEach(b=> b.onclick = async()=>{
      const act=b.dataset.act;
      try{
        if(act==='load'){ applySettings(p.settings); saveSession(); toast(`「${p.name}」を開きました。`); }
        if(act==='over'){ const {settings,note}=presetBody(); const n2=await putPreset({...p, settings, updatedAt:new Date().toISOString()}); await paintPresets(); toast(note||n2||`「${p.name}」に上書き保存しました。`, (note||n2)?'err':''); }
        if(act==='del'){ if(row.dataset.confirm!=='1'){ row.dataset.confirm='1'; b.textContent='本当に削除'; setTimeout(()=>{ row.dataset.confirm=''; b.textContent='削除'; },3000); return; } await delPreset(p.id); await paintPresets(); }
      }catch(e){ toast('保存先とのやりとりに失敗しました：'+(e?.message||e),'err'); }
    });
  });
}
$('#savePreset').onclick = async()=>{
  const name=$('#presetName').value.trim() || `賞状 ${new Date().toLocaleDateString('ja-JP')}`;
  try{
    const {settings,note} = presetBody();
    const n2 = await putPreset({id:'p'+Date.now().toString(36), name, updatedAt:new Date().toISOString(), settings});
    $('#presetName').value=''; await paintPresets(); markDone(true);
    toast(note||n2||`「${name}」として保存しました。`, (note||n2)?'err':'');
  }catch(e){ toast('設定を保存できませんでした：'+(e?.message||e),'err'); }
};
$('#expJson').onclick = ()=> deliver(new Blob([JSON.stringify(S,null,1)],{type:'application/json'}), safeName(S.fileName||'賞状')+'_設定.json');
$('#impJson').onclick = ()=> $('#jsonInput').click();
$('#jsonInput').onchange = async e=>{
  const f=e.target.files[0]; e.target.value=''; if(!f) return;
  try{ applySettings(JSON.parse(await f.text())); saveSession(); toast('設定ファイルを読み込みました。'); }
  catch(err){ toast('設定ファイルを読めませんでした。','err'); }
};
$('#resetAll').onclick = ()=>{
  const b=$('#resetAll');
  if(b.dataset.confirm!=='1'){ b.dataset.confirm='1'; b.textContent='もう一度押すと初期化'; setTimeout(()=>{ b.dataset.confirm=''; b.textContent='最初からやり直す'; },3000); return; }
  b.dataset.confirm=''; b.textContent='最初からやり直す';
  applySettings(defaultSettings()); saveSession(); goTab('bg');
};

/* ============================================================
   タブ（手順）
   ============================================================ */
let savedOnce=false;
function markDone(saved){
  if(saved) savedOnce=true;
  const done = {bg:!!bgImage, data:RECORDS.length>0, items:S.elements.length>0, save:savedOnce};
  $$('.steps button').forEach(b=> b.classList.toggle('done', !!done[b.dataset.tab]));
}
function goTab(name){
  $$('.steps button').forEach(x=>x.setAttribute('aria-selected', String(x.dataset.tab===name)));
  $$('.pane').forEach(p=> p.classList.toggle('on', p.dataset.pane===name));
  $('.tabpanes').scrollTop=0;
  $('#showFrame').checked = true;
  requestRender();
}
$$('.steps button').forEach(b=> b.onclick=()=>goTab(b.dataset.tab));
$$('.next').forEach(b=> b.onclick=()=>goTab(b.dataset.go));

/* ============================================================
   起動
   ============================================================ */
(async function init(){
  setupSteppers();
  const saved = await loadSession();
  applySettings(saved && saved.version===2 ? saved : defaultSettings());
  try{ await document.fonts.ready; }catch(e){}
  fitToStage();
  initStore();
})();
