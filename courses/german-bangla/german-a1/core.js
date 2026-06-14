
// ===== STORAGE KEYS =====
var SK={prog:'de_prog',streak:'de_streak',xp:'de_xp',srs:'de_srs',lastDay:'de_lastDay'};
// ===== TTS =====
var curAud=null;
function tts(t){
  if(curAud){curAud.pause();curAud.currentTime=0;}
  var u='https://translate.google.com/translate_tts?ie=UTF-8&q='+encodeURIComponent(t)+'&tl=de&client=tw-ob';
  var a=new Audio(u);curAud=a;a.play().catch(function(){bTTS(t);});
}
function bTTS(t){
  if(!window.speechSynthesis)return;window.speechSynthesis.cancel();
  var u=new SpeechSynthesisUtterance(t);u.lang='de-DE';u.rate=0.82;
  var v=window.speechSynthesis.getVoices();
  var g=v.find(function(x){return x.lang&&x.lang.startsWith('de');});
  if(g)u.voice=g;
  window.speechSynthesis.speak(u);
}
window.speechSynthesis&&window.speechSynthesis.getVoices&&window.speechSynthesis.getVoices();
// ===== STREAK & XP =====
function getXP(){try{return parseInt(localStorage.getItem(SK.xp)||'0');}catch(e){return 0;}}
function addXP(n){
  var v=getXP()+n;localStorage.setItem(SK.xp,v);
  var el=document.getElementById('xpTop');if(el)el.textContent=v+' XP';
}
function checkStreak(){
  var today=new Date().toISOString().slice(0,10);
  var last=localStorage.getItem(SK.lastDay)||'';
  var yesterday=new Date(Date.now()-864e5).toISOString().slice(0,10);
  var streak=parseInt(localStorage.getItem(SK.streak)||'0');
  if(last===today){}
  else if(last===yesterday){streak++;localStorage.setItem(SK.streak,streak);localStorage.setItem(SK.lastDay,today);}
  else{streak=1;localStorage.setItem(SK.streak,streak);localStorage.setItem(SK.lastDay,today);}
  var el=document.getElementById('streakTop');if(el)el.textContent=streak;
  var el2=document.getElementById('xpTop');if(el2)el2.textContent=getXP()+' XP';
}
// ===== PROGRESS =====
function getProg(){try{return JSON.parse(localStorage.getItem(SK.prog)||'{}');}catch(e){return {};}}
function updateUI(){
  var p=getProg();
  var days={d1:11,d2:11,d3:10,d4:10,d1al:9,d1qw:9,d1vb:9,d6:9,d7:9,d8:9,d9:9,d10:8,d2pp:9,d2pl:9,d2gr:9,d11:9,d12:9,d13:9,d14:9,d15:8,d3dm:9,d3sv:9,d3pr:9,d16:9,d17:9,d18:9,d19:9,d4mv:9,d4ac:9,d4ng:9,d5pf:9,d5wd:9,d5dt:9,d20:8};
  var totalDone=0,totalQ=0;
  Object.keys(days).forEach(function(day){
    var total=days[day];
    var visited=Object.keys(p).filter(function(k){return k.startsWith(day);}).length;
    var pct=Math.min(100,Math.round(visited/total*100));
    var bar=document.getElementById('prog-'+day);
    var txt=document.getElementById('progtext-'+day);
    var bn_total={d1:'১১',d2:'১১',d3:'১০',d4:'১০',d1al:'৯',d1qw:'৯',d1vb:'৯',d6:'৯',d7:'৯',d8:'৯',d9:'৯',d10:'৮',d2pp:'৯',d2pl:'৯',d2gr:'৯',d11:'৯',d12:'৯',d13:'৯',d14:'৯',d15:'৮',d3dm:'৯',d3sv:'৯',d3pr:'৯',d16:'৯',d17:'৯',d18:'৯',d19:'৯',d4mv:'৯',d4ac:'৯',d4ng:'৯',d5pf:'৯',d5wd:'৯',d5dt:'৯',d20:'৮'};
    var bn_arr=['০','১','২','৩','৪','৫','৬','৭','৮','৯','১০','১১','১২'];
    var bn_done=bn_arr[Math.min(visited,12)];
    if(bar)bar.style.width=pct+'%';
    if(txt)txt.textContent=bn_done+'/'+(bn_total[day]||'৯')+' পাঠ';
    var wcp=document.getElementById('wc-prog-'+day);
    if(wcp)wcp.textContent=pct+'% সম্পন্ন';
    if(pct===100){var dh=document.getElementById('dh'+day.replace('d',''));if(dh)dh.classList.add('done');}
    totalDone+=visited;totalQ+=total;
  });
  var chLessons={ch1:['d1','d2','d3','d4','d1al','d1qw','d1vb'],ch2:['d6','d7','d8','d9','d10','d2pp','d2pl','d2gr'],ch3:['d11','d12','d13','d14','d15','d3dm','d3sv','d3pr'],ch4:['d16','d17','d18','d19','d4mv','d4ac','d4ng'],ch5:['d20','d5pf','d5wd','d5dt']};
  Object.keys(chLessons).forEach(function(chId){
    var chDays=chLessons[chId];
    var chTotal=chDays.reduce(function(s,d){return s+(days[d]||9);},0);
    var chDone=chDays.reduce(function(s,d){return s+Object.keys(p).filter(function(k){return k.startsWith(d);}).length;},0);
    var chPct=Math.min(100,Math.round(chDone/chTotal*100));
    var chEl=document.getElementById('wc-prog-'+chId);
    if(chEl)chEl.textContent=chPct===100?'✅ সম্পন্ন!':chPct+'% সম্পন্ন';
  });
  var qd=document.getElementById('quizzesDone');if(qd)qd.textContent=Object.keys(getProg()).filter(function(k){return k.endsWith('q');}).length;
  var srs=getSRS();
  var due=getDueCards().length;
  var sc=document.getElementById('srsCount');if(sc)sc.textContent=due;
}
function updateSRSBadge(){
  var due=getDueCards().length;
  var b=document.getElementById('srsBadge');
  if(b){b.textContent=due;if(due>0){b.classList.add('show');}else{b.classList.remove('show');}}
}
function markVisit(day,tab){
  var p=getProg();p[tab]=1;localStorage.setItem(SK.prog,JSON.stringify(p));
  var el=document.getElementById('nav-'+tab);if(el)el.classList.add('visited');
  updateUI();
}
// ===== NAVIGATION =====
function go(page,navId){
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.nav-item').forEach(function(n){n.classList.remove('active');});
  var _pg=document.getElementById('page-'+page);if(_pg){_pg.classList.add('active');}else{return;}
  var ni=document.getElementById(navId);if(ni){ni.classList.add('active');ni.classList.add('visited');}
  var ma=document.getElementById('mainArea');if(ma)ma.scrollTop=0;
  if(window.innerWidth<=640){var sb=document.getElementById('sidebar');if(sb)sb.classList.remove('open');}
  var allSpPages=(typeof _CH_SP!=='undefined')?_CH_SP:['d1s','d2s','d3s','d4s','d5s','d1als','d1qws','d1vbs','d2pps','d2pls','d2grs','d3dms','d3svs','d3prs','d4mvs','d4acs','d4ngs','d5pfs','d5wds','d5dts','d6s','d7s','d8s','d9s','d10s','d11s','d12s','d13s','d14s','d15s','d16s','d17s','d18s','d19s','d20s'];
  if(allSpPages.indexOf(page)>=0)buildSp(page);
  var allQzPages=(typeof _CH_QZ!=='undefined')?_CH_QZ:['d1q','d2q','d3q','d4q','d5q','d1alq','d1qwq','d1vbq','d2ppq','d2plq','d2grq','d3dmq','d3svq','d3prq','d4mvq','d4acq','d4ngq','d5pfq','d5wdq','d5dtq','d6q','d7q','d8q','d9q','d10q','d11q','d12q','d13q','d14q','d15q','d16q','d17q','d18q','d19q','d20q'];
  if(allQzPages.indexOf(page)>=0)buildQuiz(page);
  var allFitbPages=(typeof _CH_FITB!=='undefined')?_CH_FITB:['d1w','d2w','d3w','d4w','d1alw','d1qww','d1vbw','d2ppw','d2plw','d2grw','d3dmw','d3svw','d3prw','d4mvw','d4acw','d4ngw','d5pfw','d5wdw','d5dtw','d6w','d7w','d8w','d9w','d11w','d12w','d13w','d14w','d16w','d17w','d18w','d19w'];
  if(allFitbPages.indexOf(page)>=0)buildFITB(page);
  if(page==='d20q'){var el=document.getElementById('certXP');if(el)el.textContent=getXP();}
  if(page==='srs')buildSRS();
}
function toggleSB(){
  var sb=document.getElementById('sidebar');
  if(sb){if(sb.classList.contains('open')){sb.classList.remove('open');}else{sb.classList.add('open');}}
}

function toggleExamItem(key) {
  var dl = document.getElementById('exam-dl-' + key); if(dl) dl.className = dl.className; // uses exam-tab-list
  var dh = document.getElementById('exam-dh-' + key);
  if (!dl || !dh) return;
  var isOpen = dl.classList.contains('open');
  if (isOpen) { dl.classList.remove('open'); dh.classList.remove('open'); }
  else { dl.classList.add('open'); dh.classList.add('open'); }
}
function toggleExamSB(){
  var body=document.getElementById('exam-body');
  var hdr=document.getElementById('exam-hdr');
  if(!body||!hdr)return;
  var isOpen=body.classList.contains('open');
  if(isOpen){body.classList.remove('open');hdr.classList.remove('open');}
  else{body.classList.add('open');hdr.classList.add('open');}
}
function toggleWeek(n){
  var tl=document.getElementById('wl'+n),hdr=document.getElementById('wh'+n);
  if(!tl||!hdr)return;
  var isOpen=tl.classList.contains('open');
  for(var i=1;i<=6;i++){if(i!==n){var d=document.getElementById('wl'+i);var h=document.getElementById('wh'+i);if(d)d.classList.remove('open');if(h)h.classList.remove('open');}}
  if(!isOpen){tl.classList.add('open');hdr.classList.add('open');}
  else{tl.classList.remove('open');hdr.classList.remove('open');}
}
function toggleDay(n){
  var dl=document.getElementById('dl'+n),dh=document.getElementById('dh'+n);
  if(!dl||!dh)return;
  var isOpen=dl.classList.contains('open');
  document.querySelectorAll('.tab-list').forEach(function(t){t.classList.remove('open');});
  document.querySelectorAll('.day-hdr').forEach(function(h){h.classList.remove('open');});
  if(!isOpen){dl.classList.add('open');dh.classList.add('open');}
}
function openWeek(n){var tl=document.getElementById('wl'+n);var h=document.getElementById('wh'+n);if(tl)tl.classList.add('open');if(h)h.classList.add('open');}
function openDay(n){var dl=document.getElementById('dl'+n);var dh=document.getElementById('dh'+n);if(dl)dl.classList.add('open');if(dh)dh.classList.add('open');}
// ===== NUMBERS GRID =====
var n1d=[{n:1,de:'eins',bn:'এক'},{n:2,de:'zwei',bn:'দুই'},{n:3,de:'drei',bn:'তিন'},{n:4,de:'vier',bn:'চার'},{n:5,de:'fünf',bn:'পাঁচ'},{n:6,de:'sechs',bn:'ছয়'},{n:7,de:'sieben',bn:'সাত'},{n:8,de:'acht',bn:'আট'},{n:9,de:'neun',bn:'নয়'},{n:10,de:'zehn',bn:'দশ'}];
var n2d=[{n:20,de:'zwanzig',bn:'বিশ'},{n:30,de:'dreißig',bn:'ত্রিশ'},{n:40,de:'vierzig',bn:'চল্লিশ'},{n:50,de:'fünfzig',bn:'পঞ্চাশ'},{n:60,de:'sechzig',bn:'ষাট'},{n:70,de:'siebzig',bn:'সত্তর'},{n:80,de:'achtzig',bn:'আশি'},{n:90,de:'neunzig',bn:'নব্বই'},{n:100,de:'hundert',bn:'একশো'}];
var n3d=[{n:21,de:'einundzwanzig',bn:'একুশ'},{n:25,de:'fünfundzwanzig',bn:'পঁচিশ'},{n:32,de:'zweiunddreißig',bn:'বত্রিশ'},{n:45,de:'fünfundvierzig',bn:'পঁয়তাল্লিশ'},{n:50,de:'fünfzig',bn:'পঞ্চাশ'},{n:99,de:'neunundneunzig',bn:'নিরানব্বই'}];
function numCard(o){return '<div class="nc" onclick="tts(\''+o.de+'\')"><div class="nc-n">'+o.n+'</div><div class="nc-de">'+o.de+'</div><div class="nc-b">'+o.bn+'</div></div>';}
var _n1=document.getElementById('n1'),_n2=document.getElementById('n2'),_n3=document.getElementById('n3');
if(_n1)_n1.innerHTML=n1d.map(numCard).join('');
if(_n2)_n2.innerHTML=n2d.map(numCard).join('');
if(_n3)_n3.innerHTML=n3d.map(numCard).join('');
// ===== COLORS GRID =====
var colorsData=[{de:'rot',bn:'লাল',e:'🔴',bg:'#e74c3c'},{de:'blau',bn:'নীল',e:'🔵',bg:'#3498db'},{de:'grün',bn:'সবুজ',e:'🟢',bg:'#006A4E'},{de:'gelb',bn:'হলুদ',e:'🟡',bg:'#f1c40f'},{de:'weiß',bn:'সাদা',e:'⚪',bg:'#ecf0f1'},{de:'schwarz',bn:'কালো',e:'⚫',bg:'#2c3e50'},{de:'orange',bn:'কমলা',e:'🟠',bg:'#e67e22'},{de:'lila',bn:'বেগুনি',e:'🟣',bg:'#8e44ad'},{de:'rosa',bn:'গোলাপি',e:'🩷',bg:'#e91e8c'},{de:'braun',bn:'বাদামি',e:'🟤',bg:'#795548'}];
var cpg=document.getElementById('colorPicGrid');
if(cpg){colorsData.forEach(function(c){var d=document.createElement('div');d.className='pic-card';d.onclick=function(){tts(c.de);};d.innerHTML='<div class="pic-img" style="background:'+c.bg+';font-size:2rem">'+c.e+'<button class="pic-play" onclick="event.stopPropagation();tts(\''+c.de+'\')">🔊</button></div><div class="pic-info"><div class="pic-de">'+c.de+'</div><div class="pic-en">'+c.bn+'</div></div>';cpg.appendChild(d);});}
// ===== ARTICLE REVIEW =====
var artData=[{de:'der Vater',bn:'বাবা',g:'der'},{de:'die Mutter',bn:'মা',g:'die'},{de:'das Kind',bn:'সন্তান',g:'das'},{de:'der Bruder',bn:'ভাই',g:'der'},{de:'die Schwester',bn:'বোন',g:'die'},{de:'der Mann',bn:'স্বামী',g:'der'},{de:'die Frau',bn:'স্ত্রী',g:'die'},{de:'das Haus',bn:'বাড়ি',g:'das'},{de:'die Schule',bn:'স্কুল',g:'die'},{de:'der Bahnhof',bn:'স্টেশন',g:'der'}];
var artGrid=document.getElementById('artRevGrid');
if(artGrid){artData.forEach(function(a){var d=document.createElement('div');d.className='art-flip';d.innerHTML='<div class="art-front"><span class="art-de">'+a.de.split(' ')[1]+'</span><span class="art-hint">টেপ করুন</span></div><div class="art-back"><span class="art-art '+a.g+'">'+a.de.split(' ')[0]+'</span><span class="art-bn">'+a.bn+'</span></div>';d.onclick=function(){d.classList.toggle('flipped');tts(a.de);};artGrid.appendChild(d);});}
// ===== SRS SM-2 =====
function getSRS(){try{return JSON.parse(localStorage.getItem(SK.srs)||'[]');}catch(e){return [];}}
function saveSRS(arr){localStorage.setItem(SK.srs,JSON.stringify(arr));}
function sm2Update(card,quality){
  if(!card.easeFactor)card.easeFactor=2.5;
  if(!card.repetitions)card.repetitions=0;
  if(!card.interval)card.interval=1;
  if(!card.lapses)card.lapses=0;
  if(quality>=3){
    if(card.repetitions===0)card.interval=1;
    else if(card.repetitions===1)card.interval=3;
    else card.interval=Math.round(card.interval*card.easeFactor);
    card.repetitions++;
  }else{card.repetitions=0;card.interval=1;card.lapses++;}
  card.easeFactor=Math.max(1.3,card.easeFactor+0.1-(5-quality)*(0.08+(5-quality)*0.02));
  var next=new Date();next.setDate(next.getDate()+card.interval);
  card.nextReview=next.toISOString().slice(0,10);
  card.lastReview=new Date().toISOString().slice(0,10);
  card.known=(card.repetitions>=3&&card.interval>=7);
  return card;
}
function getDueCards(){
  var today=new Date().toISOString().slice(0,10);
  return getSRS().filter(function(c){return !c.nextReview||c.nextReview<=today;});
}
function getNextReviewText(card){
  if(!card.nextReview)return 'Review now';
  var today=new Date().toISOString().slice(0,10);
  if(card.nextReview<=today)return 'Due now';
  var diff=Math.round((new Date(card.nextReview)-new Date(today))/(1000*60*60*24));
  if(diff===1)return 'Tomorrow';
  if(diff<7)return 'In '+diff+' days';
  if(diff<30)return 'In '+Math.round(diff/7)+' week'+(diff>=14?'s':'');
  return 'In '+Math.round(diff/30)+' month'+(diff>=60?'s':'');
}
function addToSRS(item){
  var srs=getSRS();
  if(!srs.find(function(x){return x.de===item.de;})){
    var today=new Date().toISOString().slice(0,10);
    srs.push({de:item.de,bn:item.bn,ctx:item.ctx,interval:1,easeFactor:2.5,repetitions:0,lapses:0,nextReview:today,lastReview:null,known:false,added:Date.now()});
    saveSRS(srs);updateSRSBadge();
    var sc=document.getElementById('srsCount');if(sc)sc.textContent=getDueCards().length;
  }
}
function buildSRS(){
  var c=document.getElementById('srsContainer');if(!c)return;
  c.innerHTML='';
  var due=getDueCards();var all=getSRS();
  var learned=all.filter(function(x){return x.known;}).length;
  var statsDiv=document.createElement('div');statsDiv.className='srs-stats';
  statsDiv.innerHTML='<div class="srs-stat"><span class="srs-stat-n">'+due.length+'</span><span class="srs-stat-l">Due today</span></div><div class="srs-stat"><span class="srs-stat-n">'+all.length+'</span><span class="srs-stat-l">Total words</span></div><div class="srs-stat"><span class="srs-stat-n">'+learned+'</span><span class="srs-stat-l">Learned</span></div>';
  c.appendChild(statsDiv);
  if(due.length===0){
    var next=all.filter(function(x){return x.nextReview;}).sort(function(a,b){return a.nextReview>b.nextReview?1:-1;})[0];
    var msg=next?'Next review: '+getNextReviewText(next):'Do some quizzes to add words here!';
    c.innerHTML+='<div class="srs-empty">🎉 All caught up!<br><br><small>'+msg+'</small></div>';
    return;
  }
  due.forEach(function(item,i){
    var reps=item.repetitions||0;
    var d=document.createElement('div');d.className='srs-card';
    d.innerHTML='<div class="srs-progress-row"><span class="srs-interval-badge">'+getNextReviewText(item)+'</span><span class="srs-reps">⭐×'+reps+'</span></div><div class="srs-front">'+item.de+'</div><div class="srs-hint">Tap to reveal · click 🔊 to hear</div><div class="srs-back" id="srsb-'+i+'"><div class="srs-bn">'+item.bn+'</div><div class="srs-en">'+(item.ctx||'')+'</div><div class="srs-rating"><div class="srs-rating-label">How well did you remember?</div><div class="srs-rating-btns"><button class="srs-btn srs-q0" onclick="markSRS(\''+item.de+'\',0,'+i+')">😶 Forgot</button><button class="srs-btn srs-q3" onclick="markSRS(\''+item.de+'\',3,'+i+')">🤔 Hard</button><button class="srs-btn srs-q4" onclick="markSRS(\''+item.de+'\',4,'+i+')">😊 Good</button><button class="srs-btn srs-q5" onclick="markSRS(\''+item.de+'\',5,'+i+')">⚡ Easy</button></div></div></div>';
    d.onclick=function(e){if(!e.target.classList.contains('srs-btn')){var back=document.getElementById('srsb-'+i);if(back)back.classList.toggle('show');tts(item.de);}};
    c.appendChild(d);
  });
}
function markSRS(de,quality,i){
  var srs=getSRS();
  var idx=srs.findIndex(function(x){return x.de===de;});
  if(idx>=0){srs[idx]=sm2Update(srs[idx],quality);saveSRS(srs);}
  if(quality>=3)addXP(quality===5?10:quality===4?7:5);
  buildSRS();updateSRSBadge();updateUI();
}

// ===== SPEAKING TEST =====
function buildSp(day){
  var c=document.getElementById('sp-'+day);if(!c||c.children.length>0)return;
  if(!spData[day]){c.innerHTML='<p style="padding:16px">Speaking data coming soon!</p>';return;}
  if(!spRes[day])spRes[day]={};
  spData[day].forEach(function(p,i){
    var d=document.createElement('div');d.className='sp-card';d.id='spc-'+day+i;
    d.innerHTML='<div class="sp-de">'+p.de+'</div><div class="sp-en">'+p.en+'</div><div class="sp-bn">'+p.bn+'</div><div class="sp-hint">🗣️ '+p.h+'</div><div class="sp-actions"><button class="sp-btn sp-play" onclick="tts(\''+p.de.replace(/'/g,"\\'")+'\')" >🔊 শুনুন</button><button class="sp-btn sp-rec" id="recbtn-'+day+'-'+p.id+'" onclick="startRec(\''+day+'\',\''+p.id+'\',\''+p.de.replace(/'/g,"\\'")+'\',this)">🎤 বলুন</button></div><div class="sp-result" id="spr-'+day+'-'+p.id+'"></div>';
    c.appendChild(d);
  });
  var sc=document.createElement('div');sc.className='sp-score-wrap';
  sc.innerHTML='<button class="btn" onclick="showSpScore(\''+day+'\')">আমার স্কোর 🏆</button><div class="sp-score" id="spscore-'+day+'"></div>';
  c.appendChild(sc);
}
function startRec(day,id,target,btn){
  if(!window.SpeechRecognition&&!window.webkitSpeechRecognition){alert('Chrome browser দরকার speech recognition এর জন্য!');return;}
  var R=window.SpeechRecognition||window.webkitSpeechRecognition;
  var rec=new R();rec.lang='de-DE';rec.interimResults=false;rec.maxAlternatives=3;
  btn.textContent='⏹ থামুন';btn.classList.add('recording');
  rec.onresult=function(e){
    var alts=Array.from({length:e.results[0].length},function(_,i){return e.results[0][i].transcript.toLowerCase();});
    doRes(day,id,target,alts);
  };
  rec.onerror=function(e){
    var m={'no-speech':'কোনো কথা শোনা যায়নি।','audio-capture':'মাইক্রোফোন পাওয়া যাচ্ছে না।','not-allowed':'মাইক্রোফোন permission দিন।'};
    if(m[e.error]){alert(m[e.error]);}
    rstBtn(day,id,btn);
  };
  rec.onend=function(){rstBtn(day,id,btn);};
  rec.start();
  btn.onclick=function(){rec.stop();btn.onclick=function(){startRec(day,id,target,btn);};};
}
function rstBtn(day,id,btn){
  var p=spData[day]&&spData[day].find(function(p){return p.id===id;});
  btn.textContent='🎤 বলুন';btn.classList.remove('recording');
  btn.onclick=function(){startRec(day,id,p?p.de:target,btn);};
}
function lev(a,b){
  var m=a.length,n=b.length,dp=[];
  for(var i=0;i<=m;i++){dp[i]=[i];for(var j=1;j<=n;j++){dp[i][j]=i?Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]!==b[j-1])):j;}}
  return dp[m][n];
}
function strSim(a,b){var ml=Math.max(a.length,b.length);return ml?1-lev(a,b)/ml:1;}
function doRes(day,id,targetRaw,alts){
  var target=targetRaw.toLowerCase().replace(/[!?.]/g,'').trim();
  var tw=target.split(' ');
  var best=0;
  alts.forEach(function(a){var s=strSim(target,a.replace(/[!?.]/g,'').trim());if(s>best)best=s;});
  var wm=0;
  alts.forEach(function(a){
    var aw=a.replace(/[!?.]/g,'').trim().split(' ');
    var wc=0;
    tw.forEach(function(w){if(aw.some(function(t){return t===w||lev(t,w)<=2;}))wc++;});
    var ws=tw.length?wc/tw.length:0;if(ws>wm)wm=ws;
  });
  var pct=Math.round(Math.max(best,wm)*100);
  var res=document.getElementById('spr-'+day+'-'+id);
  if(res){
    res.innerHTML='<div class="sp-pct '+(pct>=70?'ok':'no')+'">'+pct+'%</div><div class="sp-heard">শোনা গেছে: "'+alts[0]+'"</div><div class="sp-target">সঠিক: "'+targetRaw+'"</div>';
    res.classList.add('show');
  }
  if(!spRes[day])spRes[day]={};
  spRes[day][id]={pct:pct,heard:alts[0]};
  if(pct>=70){addXP(5);addToSRS({de:targetRaw,bn:spData[day]&&spData[day].find(function(p){return p.id===id;})?spData[day].find(function(p){return p.id===id;}).bn:'',ctx:''});}
}
function showSpScore(day){
  var res=spRes[day]||{};var total=spData[day]?spData[day].length:0;
  var done=Object.keys(res).length;var avg=done?Math.round(Object.keys(res).reduce(function(s,k){return s+res[k].pct;},0)/done):0;
  var el=document.getElementById('spscore-'+day);
  if(el){el.innerHTML='<div class="sc-big">'+avg+'%</div><div class="sc-lbl">গড় স্কোর ('+done+'/'+total+' সম্পন্ন)</div>';el.classList.add('show');}
  if(avg>=60)addXP(10);
}
// ===== FILL IN THE BLANK =====
function buildFITB(day){
  var c=document.getElementById('fitb-'+day);
  if(!c||c.children.length>0)return;
  if(!fitbData[day]){c.innerHTML='<p style="padding:16px">Fill-in-blank data coming soon!</p>';return;}
  fitbData[day].forEach(function(q,i){
    var d=document.createElement('div');d.className='fitb-card';d.id='fitbc-'+day+i;
    var inlineInput='<input class="fitb-inline" id="fitbin-'+day+i+'" type="text"'+
      ' placeholder="???" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"'+
      ' onkeydown="if(event.key===\'Enter\')checkFITB(\''+day+'\','+i+',this.value)"'+
      ' oninput="this.style.width=Math.max(60,this.value.length*12+20)+\'px\'">';
    var sentence=q.q.replace('___',inlineInput);
    d.innerHTML=
      '<div class="fitb-n">প্রশ্ন '+(i+1)+'/৫</div>'+
      '<div class="fitb-hint">'+q.hint+'</div>'+
      '<div class="fitb-sentence" id="fitbblank-'+day+i+'">'+sentence+'</div>'+
      '<div class="fitb-actions">'+
        '<button class="fitb-btn" onclick="checkFITB(\''+day+'\','+i+',document.getElementById(\'fitbin-'+day+i+'\').value)">✓ পরীক্ষা করুন</button>'+
      '</div>'+
      '<div class="fitb-fb" id="fitbfb-'+day+i+'"></div>';
    c.appendChild(d);
  });
  if(!fitbScores[day])fitbScores[day]={correct:0,total:5,done:[]};
}
function checkFITB(day,i,val){
  var q=fitbData[day][i];if(!q)return;
  var inp=document.getElementById('fitbin-'+day+i);
  var fb=document.getElementById('fitbfb-'+day+i);
  var card=document.getElementById('fitbc-'+day+i);
  var v=val.trim().toLowerCase();
  var ok=v===q.blank.toLowerCase()||lev(v,q.blank.toLowerCase())<=1;
  if(!fitbScores[day])fitbScores[day]={correct:0,total:5,done:[]};
  if(!(fitbScores[day].done||[]).includes(i)){
    (fitbScores[day].done||[]).push(i);
    if(ok)fitbScores[day].correct++;
  }
  if(ok){
    if(card)card.className='fitb-card correct';
    if(inp){inp.value=q.blank;inp.style.color='var(--green)';inp.style.borderBottomColor='var(--green)';inp.disabled=true;inp.style.width=Math.max(60,q.blank.length*13+20)+'px';}
    if(fb){fb.textContent='✅ সঠিক! '+q.blank+' — '+q.hint;fb.className='fitb-fb show ok';}
    addXP(10);
  }else{
    if(card)card.className='fitb-card wrong';
    if(inp){inp.style.color='var(--red)';inp.style.borderBottomColor='var(--red)';}
    if(fb){fb.innerHTML='❌ ভুল! সঠিক উত্তর: <strong>'+q.blank+'</strong>';fb.className='fitb-fb show no';}
    addToSRS({de:q.blank,bn:q.hint,ctx:q.q});
  }
  var t=(fitbScores[day].total||5);
  if((fitbScores[day].done||[]).length>=t){
    var sc=document.getElementById('fitb-score-'+day);
    if(sc){sc.classList.add('show');}
    if(fitbScores[day].correct>=3)addXP(15);
  }
}
// ===== QUIZ =====
function buildQuiz(day){
  var c=document.getElementById('qz-'+day);if(!c||c.children.length>0)return;
  if(!qzData[day]){c.innerHTML='<p style="padding:16px">Quiz data coming soon!</p>';return;}
  qzData[day].forEach(function(q,i){
    var d=document.createElement('div');d.className='qc';d.id='qc-'+day+i;
    d.innerHTML='<div class="q-n">প্রশ্ন '+(i+1)+'/'+qzData[day].length+'</div><div class="q-t">'+q.q+'</div><div class="q-o">'+q.o.map(function(o,j){return '<button class="qo" onclick="ansQ(\''+day+'\','+i+','+j+',this)">'+o+'</button>';}).join('')+'</div><div class="q-fb" id="qfb-'+day+'-'+i+'"></div>';
    c.appendChild(d);
  });
  var sc=document.createElement('div');
  sc.innerHTML='<button class="btn" onclick="submitQuiz(\''+day+'\')">কুইজ জমা দিন 🎯</button>\n  <div class="score" id="sc-'+day+'">\n    <div class="sc-big" id="scn-'+day+'">0/'+qzData[day].length+'</div>\n    <div class="sc-lbl">সঠিক উত্তর</div>\n    <div class="sc-msg" id="scm-'+day+'"></div>\n  </div>\n  <div class="mistakes-box" id="mb-'+day+'">\n    <div class="mistakes-hdr">❌ আপনার ভুলগুলো — ভুল থেকে শিখুন!</div>\n    <div id="mlist-'+day+'"></div>\n  </div>';
  c.appendChild(sc);
}
function ansQ(day,qi,oi,btn){
  var q=qzData[day][qi];if(!q)return;
  if(!qzAns[day])qzAns[day]={};
  qzAns[day][qi]=oi;
  var ok=(oi===q.a);
  var fb=document.getElementById('qfb-'+day+'-'+qi);
  if(fb){fb.textContent=(ok?'✅ সঠিক! Richtig! — ':'❌ ভুল! Falsch! — সঠিক: '+q.o[q.a]+' — ')+q.f;fb.className='q-fb show '+(ok?'ok':'no');}
  var btns=btn.parentNode.querySelectorAll('.qo');
  btns.forEach(function(b){b.disabled=true;});
  btn.classList.add(ok?'correct':'wrong');
  btns[q.a].classList.add('correct');
  if(!ok){
    if(!qzMistakes[day])qzMistakes[day]=[];
    qzMistakes[day].push({q:q.q,wrong:q.o[oi],correct:q.o[q.a],f:q.f,tip:q.f});
    addToSRS({de:q.o[q.a],bn:q.f,ctx:q.q});
  }
}
function submitQuiz(day){
  var ans=qzAns[day]||{};var total=qzData[day].length;
  var answered=Object.keys(ans).length;
  if(answered<total){alert('সব প্রশ্নের উত্তর দিন! বাকি আছে: '+(total-answered)+'টি');return;}
  var correct=Object.keys(ans).filter(function(k){return ans[k]===qzData[day][k].a;}).length;
  var pct=Math.round(correct/total*100);
  var scn=document.getElementById('scn-'+day);
  var scm=document.getElementById('scm-'+day);
  var sc=document.getElementById('sc-'+day);
  if(scn)scn.textContent=correct+'/'+total+' ('+pct+'%)';
  var passed=pct>=60;
  if(scm){
    if(pct>=90)scm.textContent='🏆 অসাধারণ! Ausgezeichnet! +'+correct*5+' XP';
    else if(pct>=80)scm.textContent='⭐ দারুণ! Sehr gut! +'+correct*5+' XP';
    else if(pct>=60)scm.textContent='✅ ধন্যবাদ! Gut! +'+correct*5+' XP — পাস!';
    else{
      scm.textContent='❌ আরো পড়ুন! অন্তত 60% দরকার। তুমি '+pct+'% পেয়েছ।';
      var rb=document.createElement('button');
      rb.className='btn';rb.style.marginTop='10px';rb.style.background='#e74c3c';
      rb.textContent='🔁 আবার দাও';
      rb.onclick=(function(d){return function(){retryQuiz(d);};})(day);
      scm.appendChild(rb);
    }
  }
  if(sc)sc.classList.add('show');
  if(passed){addXP(correct*5);markVisit(day,day);}
  var mistakes=qzMistakes[day]||[];
  if(mistakes.length>0){
    var mb=document.getElementById('mb-'+day);var ml=document.getElementById('mlist-'+day);
    if(mb)mb.classList.add('show');
    if(ml)ml.innerHTML=mistakes.map(function(m){return '<div class="mistake-item"><div class="mi-q">প্রশ্ন: '+m.q+'</div><div class="mi-wrong">❌ আপনার উত্তর: '+m.wrong+'</div><div class="mi-correct">✅ সঠিক হয়: '+m.correct+'</div><div class="mi-tip">💡 '+m.tip+'</div></div>';}).join('');
  }
  var sc2=document.getElementById('sc-'+day);if(sc2)sc2.scrollIntoView({behavior:'smooth'});
  Object.keys(getProg()).forEach(function(tab){var ni=document.getElementById('nav-'+tab);if(ni)ni.classList.add('visited');});
}

function retryQuiz(day){
  qzAns[day]={};
  qzMistakes[day]=[];
  var c=document.getElementById('qz-'+day);
  if(c){c.innerHTML='';}
  buildQuiz(day);
  var sc=document.getElementById('sc-'+day);if(sc)sc.classList.remove('show');
  var mb=document.getElementById('mb-'+day);if(mb)mb.classList.remove('show');
}
// ===== HELPER: Levenshtein (already defined above) =====

var spData={
  d1s:[{id:'a',de:'Guten Morgen!',en:'Good Morning!',bn:'শুভ সকাল!',h:'GOO-ten MOR-gen'},{id:'b',de:'Guten Tag!',en:'Good Day!',bn:'শুভ দিন!',h:'GOO-ten TAHG'},{id:'c',de:'Guten Abend!',en:'Good Evening!',bn:'শুভ সন্ধ্যা!',h:'GOO-ten AH-bent'},{id:'d',de:'Wie heißt du?',en:'What is your name?',bn:'তোমার নাম কী?',h:'Vee HYSST doo'},{id:'e',de:'Ich heiße Hossain.',en:'My name is Hossain.',bn:'আমার নাম হোসেন।',h:'Ikh HY-sse Hossain'},{id:'f',de:'Auf Wiedersehen!',en:'Goodbye!',bn:'বিদায়!',h:'Owf VEE-der-zay-en'}],
  d2s:[{id:'a',de:'Ich komme aus Bangladesch.',en:'I come from Bangladesh.',bn:'আমি বাংলাদেশ থেকে।',h:'Ikh KO-me ows Bang-la-DESH'},{id:'b',de:'Ich wohne in Dhaka.',en:'I live in Dhaka.',bn:'আমি ঢাকায় থাকি।',h:'Ikh VOH-ne in DA-ka'},{id:'c',de:'Ich bin dreißig Jahre alt.',en:'I am thirty years old.',bn:'আমার বয়স ত্রিশ।',h:'Ikh bin DRY-ssikh YAH-re alt'},{id:'d',de:'Ich lerne Deutsch.',en:'I am learning German.',bn:'আমি German শিখছি।',h:'Ikh LAIR-ne DOYTSH'},{id:'e',de:'Ich bin Student.',en:'I am a student.',bn:'আমি ছাত্র।',h:'Ikh bin Shtu-DENT'},{id:'f',de:'Woher kommen Sie?',en:'Where do you come from?',bn:'আপনি কোথা থেকে?',h:'VOH-hair KO-men Zee'}],
  d3s:[{id:'a',de:'eins zwei drei',en:'one two three',bn:'এক দুই তিন',h:'ynss tsvy dry'},{id:'b',de:'Wie viel kostet das?',en:'How much does that cost?',bn:'এটার দাম কত?',h:'Vee feel KOS-tet das'},{id:'c',de:'Das kostet zwanzig Euro.',en:'That costs twenty euros.',bn:'এটার দাম বিশ ইউরো।',h:'das KOS-tet TSVAN-tsikh OY-ro'},{id:'d',de:'Ich bin dreißig Jahre alt.',en:'I am thirty years old.',bn:'আমার বয়স ত্রিশ।',h:'Ikh bin DRY-ssikh YAH-re alt'},{id:'e',de:'Hundert.',en:'One hundred.',bn:'একশো।',h:'HOON-dert'},{id:'f',de:'Meine Nummer ist null-eins-zwei.',en:'My number is 0-1-2.',bn:'আমার নম্বর।',h:'MY-ne NOOM-mer'}],
  d4s:[{id:'a',de:'Das ist rot.',en:'That is red.',bn:'এটা লাল।',h:'das ist ROHT'},{id:'b',de:'Das Auto ist blau.',en:'The car is blue.',bn:'গাড়িটা নীল।',h:'das OW-to ist BLOW'},{id:'c',de:'Mein Haus ist groß.',en:'My house is big.',bn:'আমার বাড়ি বড়।',h:'myn hows ist GROHS'},{id:'d',de:'Das Wetter ist schoen.',en:'The weather is beautiful.',bn:'আবহাওয়া সুন্দর।',h:'das VET-ter ist SHERN'},{id:'e',de:'Ich bin muede.',en:'I am tired.',bn:'আমি ক্লান্ত।',h:'Ikh bin MUE-de'},{id:'f',de:'Das ist sehr gut!',en:'That is very good!',bn:'এটা খুব ভালো!',h:'das ist ZAIR goot'}],
  d5s:[{id:'a',de:'Mein Vater heißt Karim.',en:'My father is called Karim.',bn:'আমার বাবার নাম করিম।',h:'myn FA-ter HYSST ka-REEM'},{id:'b',de:'Ich habe einen Bruder.',en:'I have a brother.',bn:'আমার একটা ভাই আছে।',h:'Ikh HA-be EY-nen BROO-der'},{id:'c',de:'Meine Mutter ist Lehrerin.',en:'My mother is a teacher.',bn:'আমার মা শিক্ষিকা।',h:'MY-ne MOO-ter ist LAY-re-rin'},{id:'d',de:'Wie groß ist deine Familie?',en:'How big is your family?',bn:'তোমার পরিবার কত বড়?',h:'Vee GROHS ist DY-ne fa-MEE-lyeh'}],
  d1als:[{id:'a',de:'ae Maenner',en:'ae sounds like e',bn:'ae = e এর মতো',h:'MEN-ner'},{id:'b',de:'oe schoen',en:'oe round lips say e',bn:'ঠোঁট গোল করে e',h:'shern'},{id:'c',de:'ue ueber',en:'ue round lips say i',bn:'ঠোঁট গোল করে i',h:'ue-ber'},{id:'d',de:'ss Strasse',en:'ss sounds like double s',bn:'double s এর মতো',h:'SHTRAH-sse'},{id:'e',de:'Ich heisse Hossain.',en:'My name is Hossain.',bn:'আমার নাম হোসেন।',h:'Ikh HY-sse Hossain'},{id:'f',de:'Die Schule ist schoen.',en:'The school is beautiful.',bn:'স্কুলটা সুন্দর।',h:'dee SHOO-le ist SHERN'}],
  d1qws:[{id:'a',de:'Wie heißt du?',en:'What is your name?',bn:'তোমার নাম কী?',h:'Vee HY-sst doo'},{id:'b',de:'Woher kommst du?',en:'Where are you from?',bn:'তুমি কোথা থেকে?',h:'VOH-hair KOM-mst doo'},{id:'c',de:'Wo wohnst du?',en:'Where do you live?',bn:'তুমি কোথায় থাকো?',h:'Voh VOHNST doo'},{id:'d',de:'Wann kommst du?',en:'When are you coming?',bn:'তুমি কখন আসবে?',h:'Van KOM-mst doo'},{id:'e',de:'Warum lernst du Deutsch?',en:'Why are you learning German?',bn:'কেন German শিখছ?',h:'Va-ROOM LAIRNST doo Doytsh'},{id:'f',de:'Was ist das?',en:'What is that?',bn:'এটা কী?',h:'Vas ist das'}],
  d1vbs:[{id:'a',de:'Ich bin Student.',en:'I am a student.',bn:'আমি ছাত্র।',h:'Ikh bin Shtu-DENT'},{id:'b',de:'Du bist nett.',en:'You are nice.',bn:'তুমি ভালো।',h:'Doo bist net'},{id:'c',de:'Er ist Lehrer.',en:'He is a teacher.',bn:'সে শিক্ষক।',h:'Air ist LAY-rer'},{id:'d',de:'Wir sind Freunde.',en:'We are friends.',bn:'আমরা বন্ধু।',h:'Veer zint FROYN-de'},{id:'e',de:'Ich habe einen Bruder.',en:'I have a brother.',bn:'আমার একটা ভাই আছে।',h:'Ikh HA-be EY-nen BROO-der'},{id:'f',de:'Du hast Zeit.',en:'You have time.',bn:'তোমার সময় আছে।',h:'Doo hast Tsyt'},{id:'g',de:'Sie hat Hunger.',en:'She is hungry.',bn:'সে ক্ষুধার্ত।',h:'Zee hat HOONG-er'},{id:'h',de:'Wir wohnen in Berlin.',en:'We live in Berlin.',bn:'আমরা বার্লিনে থাকি।',h:'Veer VOH-nen in Ber-LEEN'}],
  d2pps:[{id:'a',de:'mein Vater',en:'my father',bn:'আমার বাবা',h:'myn FA-ter'},{id:'b',de:'meine Mutter',en:'my mother',bn:'আমার মা',h:'MY-ne MOO-ter'},{id:'c',de:'dein Bruder',en:'your brother',bn:'তোমার ভাই',h:'dyn BROO-der'},{id:'d',de:'sein Sohn',en:'his son',bn:'তার ছেলে',h:'zyn zohn'},{id:'e',de:'ihre Tochter',en:'her daughter',bn:'তার মেয়ে',h:'EE-re TOKH-ter'},{id:'f',de:'Meine Familie wohnt in Dhaka.',en:'My family lives in Dhaka.',bn:'আমার পরিবার ঢাকায় থাকে।',h:'MY-ne fa-MEE-lyeh vohnt in DA-ka'}],
  d2pls:[{id:'a',de:'die Maenner',en:'the men',bn:'পুরুষরা',h:'dee MEN-ner'},{id:'b',de:'die Frauen',en:'the women',bn:'মহিলারা',h:'dee FROW-en'},{id:'c',de:'die Kinder',en:'the children',bn:'শিশুরা',h:'dee KIN-der'},{id:'d',de:'die Buecher',en:'the books',bn:'বইগুলো',h:'dee BUE-kher'},{id:'e',de:'die Haeuser',en:'the houses',bn:'বাড়িগুলো',h:'dee HOY-zer'},{id:'f',de:'Pluralformen benutzen die.',en:'All plurals use die.',bn:'বহুবচনে die।',h:'A-le plu-RAL-for-men'}],
  d2grs:[{id:'a',de:'die Wohnung',en:'the apartment',bn:'অ্যাপার্টমেন্ট',h:'dee VOH-noong'},{id:'b',de:'die Freundschaft',en:'the friendship',bn:'বন্ধুত্ব',h:'dee FROYN-shaft'},{id:'c',de:'die Universitaet',en:'the university',bn:'বিশ্ববিদ্যালয়',h:'dee oo-nee-vair-zee-TAYT'},{id:'d',de:'das Maedchen',en:'the girl',bn:'মেয়ে',h:'das MAYT-khen'},{id:'e',de:'das Essen',en:'the food',bn:'খাবার',h:'das ES-sen'},{id:'f',de:'der Sommer der Montag',en:'Summer and Monday are der.',bn:'ঋতু ও দিন সব der।',h:'dair ZOM-mer dair MON-tahg'}],
  d3dms:[{id:'a',de:'am Montag',en:'on Monday',bn:'সোমবারে',h:'am MON-tahg'},{id:'b',de:'im Januar',en:'in January',bn:'জানুয়ারিতে',h:'im ya-NOO-ar'},{id:'c',de:'am ersten Maerz',en:'on the 1st of March',bn:'১লা মার্চে',h:'am AIR-sten Mairts'},{id:'d',de:'Wann hast du Geburtstag?',en:'When is your birthday?',bn:'তোমার জন্মদিন কবে?',h:'Van hast doo ge-BOORTZ-tahg'},{id:'e',de:'Ich habe am fuenften Oktober Geburtstag.',en:'My birthday is on the 5th of October.',bn:'আমার জন্মদিন ৫ই অক্টোবর।',h:'am FUENF-ten ok-TOH-ber'},{id:'f',de:'Am Montag arbeite ich.',en:'On Monday I work.',bn:'সোমবারে আমি কাজ করি।',h:'am MON-tahg AR-by-te ikh'}],
  d3svs:[{id:'a',de:'Ich stehe um sieben Uhr auf.',en:'I get up at 7.',bn:'আমি সাতটায় উঠি।',h:'ikh SHTAY-e oom TSEE-ben oor OWF'},{id:'b',de:'Ich rufe dich an.',en:'I will call you.',bn:'আমি তোমাকে ফোন করব।',h:'ikh ROO-fe dikh an'},{id:'c',de:'Er kauft heute ein.',en:'He is shopping today.',bn:'সে আজ কেনাকাটা করছে।',h:'air KOWFT HOY-te yn'},{id:'d',de:'Wir sehen abends fern.',en:'We watch TV in the evenings.',bn:'আমরা সন্ধ্যায় TV দেখি।',h:'veer ZAY-en AH-bents fairn'},{id:'e',de:'Wann kommst du an?',en:'When do you arrive?',bn:'তুমি কখন পৌঁছাবে?',h:'van komst doo an'},{id:'f',de:'Der Zug faehrt um neun Uhr ab.',en:'The train departs at 9.',bn:'ট্রেন ৯টায় ছাড়ে।',h:'dair tsoog fairt oom noyn oor ap'}],
  d3prs:[{id:'a',de:'Ich bin in der Schule.',en:'I am in school.',bn:'আমি স্কুলে আছি।',h:'ikh bin in dair SHOO-le'},{id:'b',de:'Das Buch liegt auf dem Tisch.',en:'The book is on the table.',bn:'বইটা টেবিলে আছে।',h:'das bookh leekt owf daym tish'},{id:'c',de:'Ich fahre nach Berlin.',en:'I am travelling to Berlin.',bn:'আমি বার্লিনে যাচ্ছি।',h:'ikh FA-re nakh Ber-LEEN'},{id:'d',de:'Ich gehe zum Arzt.',en:'I am going to the doctor.',bn:'আমি ডাক্তারের কাছে যাচ্ছি।',h:'ikh GAY-e tsoom artst'},{id:'e',de:'Ich fahre mit dem Zug.',en:'I am travelling by train.',bn:'আমি ট্রেনে যাচ্ছি।',h:'ikh FA-re mit daym tsoog'},{id:'f',de:'Ich komme von der Arbeit.',en:'I am coming from work.',bn:'আমি কাজ থেকে আসছি।',h:'ikh KO-me fon dair AR-byt'}],
  d4mvs:[{id:'a',de:'Ich kann Deutsch sprechen.',en:'I can speak German.',bn:'আমি German বলতে পারি।',h:'ikh kan DOYTSH SHPREKH-en'},{id:'b',de:'Ich muss jetzt gehen.',en:'I have to go now.',bn:'আমাকে এখন যেতে হবে।',h:'ikh moos yetst GAY-en'},{id:'c',de:'Ich will Deutsch lernen.',en:'I want to learn German.',bn:'আমি German শিখতে চাই।',h:'ikh vil DOYTSH LAIR-nen'},{id:'d',de:'Darf ich hier sitzen?',en:'May I sit here?',bn:'আমি কি এখানে বসতে পারি?',h:'darf ikh heer ZIT-sen'},{id:'e',de:'Ich moechte einen Kaffee bitte.',en:'I would like a coffee please.',bn:'আমি একটা কফি চাই।',h:'ikh MERKH-te EY-nen KA-fay BIT-te'},{id:'f',de:'Kannst du mir helfen?',en:'Can you help me?',bn:'তুমি কি সাহায্য করতে পারবে?',h:'kanst doo meer HEL-fen'}],
  d4acs:[{id:'a',de:'Ich kaufe einen Apfel.',en:'I buy an apple.',bn:'আমি একটা আপেল কিনি।',h:'ikh KOW-fe EY-nen AP-fel'},{id:'b',de:'Ich trinke einen Kaffee.',en:'I drink a coffee.',bn:'আমি একটা কফি পান করি।',h:'ikh TRIN-ke EY-nen KA-fay'},{id:'c',de:'Ich esse eine Banane.',en:'I eat a banana.',bn:'আমি একটা কলা খাই।',h:'ikh ES-se EYE-ne ba-NA-ne'},{id:'d',de:'Ich lese ein Buch.',en:'I read a book.',bn:'আমি একটা বই পড়ি।',h:'ikh LAY-ze yn bookh'},{id:'e',de:'Ich sehe den Mann.',en:'I see the man.',bn:'আমি লোকটাকে দেখছি।',h:'ikh ZAY-e dayn man'},{id:'f',de:'Was kaufst du?',en:'What are you buying?',bn:'তুমি কী কিনছ?',h:'vas KOWFST doo'}],
  d4ngs:[{id:'a',de:'Ich arbeite nicht.',en:'I do not work.',bn:'আমি কাজ করি না।',h:'ikh ar-BY-te nikht'},{id:'b',de:'Das ist nicht gut.',en:'That is not good.',bn:'এটা ভালো না।',h:'das ist nikht goot'},{id:'c',de:'Ich habe kein Auto.',en:'I do not have a car.',bn:'আমার কোনো গাড়ি নেই।',h:'ikh HA-be kyn OW-toh'},{id:'d',de:'Ich habe keine Zeit.',en:'I do not have time.',bn:'আমার সময় নেই।',h:'ikh HA-be KY-ne tsyt'},{id:'e',de:'Er hat keinen Bruder.',en:'He does not have a brother.',bn:'তার কোনো ভাই নেই।',h:'air hat KY-nen BROO-der'},{id:'f',de:'Ich kann nicht kommen.',en:'I cannot come.',bn:'আমি আসতে পারব না।',h:'ikh kan nikht KO-men'}],
  d5pfs:[{id:'a',de:'Ich habe gegessen.',en:'I have eaten.',bn:'আমি খেয়েছি।',h:'ikh HA-be ge-ES-sen'},{id:'b',de:'Ich habe Deutsch gelernt.',en:'I have learned German.',bn:'আমি German শিখেছি।',h:'ikh HA-be DOYTSH ge-LAIRNT'},{id:'c',de:'Ich bin nach Hause gegangen.',en:'I went home.',bn:'আমি বাড়ি গিয়েছি।',h:'ikh bin nakh HOW-ze ge-GAN-gen'},{id:'d',de:'Ich bin nach Berlin gefahren.',en:'I travelled to Berlin.',bn:'আমি বার্লিনে গিয়েছি।',h:'ikh bin nakh Ber-LEEN ge-FA-ren'},{id:'e',de:'Was hast du gestern gemacht?',en:'What did you do yesterday?',bn:'তুমি গতকাল কী করেছিলে?',h:'vas hast doo GES-tern ge-MAKHT'},{id:'f',de:'Ich bin zu Hause geblieben.',en:'I stayed at home.',bn:'আমি বাড়িতে ছিলাম।',h:'ikh bin tsoo HOW-ze ge-BLEE-ben'}],
  d5wds:[{id:'a',de:'Ich lerne Deutsch weil ich in Deutschland arbeiten will.',en:'I learn German because I want to work in Germany.',bn:'কারণ আমি জার্মানিতে কাজ করতে চাই।',h:'vyl ikh in DOYTSH-lant AR-by-ten vil'},{id:'b',de:'Ich bleibe zu Hause weil ich muede bin.',en:'I stay home because I am tired.',bn:'কারণ আমি ক্লান্ত।',h:'vyl ikh MUE-de bin'},{id:'c',de:'Ich weiss dass er Deutsch spricht.',en:'I know that he speaks German.',bn:'আমি জানি যে সে German বলে।',h:'ikh vys das air DOYTSH shprikht'},{id:'d',de:'Es ist gut dass du hier bist.',en:'It is good that you are here.',bn:'ভালো যে তুমি এখানে আছ।',h:'es ist goot das doo heer bist'},{id:'e',de:'Ich rufe an wenn ich Zeit habe.',en:'I will call when I have time.',bn:'যখন সময় হবে তখন ফোন করব।',h:'ikh ROO-fe an ven ikh tsyt HA-be'}],
  d5dts:[{id:'a',de:'Kannst du mir helfen?',en:'Can you help me?',bn:'তুমি কি সাহায্য করতে পারবে?',h:'kanst doo meer HEL-fen'},{id:'b',de:'Ich gebe dir das Buch.',en:'I give you the book.',bn:'আমি তোমাকে বইটা দিচ্ছি।',h:'ikh GAY-be deer das bookh'},{id:'c',de:'Ich helfe dem Mann.',en:'I help the man.',bn:'আমি লোকটাকে সাহায্য করি।',h:'ikh HEL-fe daym man'},{id:'d',de:'Das gefaellt mir sehr gut.',en:'I like that very much.',bn:'এটা আমার খুব পছন্দ।',h:'das ge-FELT meer zair goot'},{id:'e',de:'Kann ich Ihnen helfen?',en:'Can I help you formally?',bn:'আমি কি আপনাকে সাহায্য করতে পারি?',h:'kan ikh EE-nen HEL-fen'},{id:'f',de:'Ich danke dir sehr.',en:'Thank you very much.',bn:'তোমাকে অনেক ধন্যবাদ।',h:'ikh DAN-ke deer zair'}]
,
  d10s:[
    {id:'a',de:'Wie heißt du?',en:'What is your name?',bn:'তোমার নাম কী?',h:'Vee HYSST doo'},
    {id:'b',de:'Ich heiße Hossain.',en:'My name is Hossain.',bn:'আমার নাম হোসেন।',h:'Ikh HY-sse Hossain'},
    {id:'c',de:'Ich komme aus Bangladesch.',en:'I come from Bangladesh.',bn:'আমি বাংলাদেশ থেকে।',h:'Ikh KO-me ows Bang-la-DESH'},
    {id:'d',de:'Ich wohne in Dhaka.',en:'I live in Dhaka.',bn:'আমি ঢাকায় থাকি।',h:'Ikh VOH-ne in DA-ka'},
    {id:'e',de:'Guten Morgen! Wie geht es Ihnen?',en:'Good morning! How are you?',bn:'শুভ সকাল! কেমন আছেন?',h:'GOO-ten MOR-gen'},
    {id:'f',de:'Auf Wiedersehen!',en:'Goodbye!',bn:'বিদায়!',h:'Owf VEE-der-zay-en'}
  ],
  d15s:[
    {id:'a',de:'Ich fahre mit dem Zug.',en:'I travel by train.',bn:'আমি ট্রেনে যাচ্ছি।',h:'ikh FA-re mit daym tsoog'},
    {id:'b',de:'am Montag',en:'on Monday',bn:'সোমবারে',h:'am MON-tahg'},
    {id:'c',de:'Ich stehe um sieben Uhr auf.',en:'I get up at 7.',bn:'আমি সাতটায় উঠি।',h:'ikh SHTAY-e oom TSEE-ben oor OWF'},
    {id:'d',de:'Das Buch liegt auf dem Tisch.',en:'The book is on the table.',bn:'বইটা টেবিলে আছে।',h:'das bookh leekt owf daym tish'},
    {id:'e',de:'Ich bin in der Schule.',en:'I am in school.',bn:'আমি স্কুলে আছি।',h:'ikh bin in dair SHOO-le'},
    {id:'f',de:'Ich komme von der Arbeit.',en:'I am coming from work.',bn:'আমি কাজ থেকে আসছি।',h:'ikh KO-me fon dair AR-byt'}
  ]
};
var spRes={d1s:{},d2s:{},d3s:{},d4s:{},d5s:{},d10s:{},d15s:{},d1als:{},d1qws:{},d1vbs:{},d2pps:{},d2pls:{},d2grs:{},d3dms:{},d3svs:{},d3prs:{},d4mvs:{},d4acs:{},d4ngs:{},d5pfs:{},d5wds:{},d5dts:{}};

var qzAns={d1q:{},d2q:{},d3q:{},d4q:{},d5q:{}};
var qzMistakes={d1q:[],d2q:[],d3q:[],d4q:[],d5q:[]};

var fitbScores={};// ============================================================
// REWARD SYSTEM — Daily Goal, Badges, Leaderboard, Levels
// ============================================================
var DAILY_GOAL = 30;
var SK_DAILY = 'de_dailyXP';
var SK_DAILY_DATE = 'de_dailyDate';
var SK_BADGES = 'de_badges';
var SK_LB = 'de_lb_week';
var SK_LB_DATE = 'de_lb_date';

// Level thresholds
var LEVELS = [
  {min:0,    name:'Anfänger',    icon:'🌱', label:'শিক্ষার্থী'},
  {min:100,  name:'Lerner',      icon:'📚', label:'শিক্ষার্থী+'},
  {min:300,  name:'Schüler',     icon:'✏️', label:'ছাত্র'},
  {min:600,  name:'Fortschritt', icon:'⚡', label:'অগ্রগতি'},
  {min:1000, name:'Könner',      icon:'🔥', label:'দক্ষ'},
  {min:1500, name:'Meister',     icon:'🏆', label:'মাস্টার'},
  {min:2500, name:'Experte',     icon:'🌟', label:'বিশেষজ্ঞ'}
];

// Badge definitions
var BADGES = [
  {id:'first',   icon:'🌅', name:'প্রথম পাঠ',    cond:function(s){return s.xp>=10;},        tip:'প্রথম XP অর্জন!'},
  {id:'streak3', icon:'🔥', name:'৩ দিন ধারা',   cond:function(s){return s.streak>=3;},     tip:'৩ দিন টানা পড়া!'},
  {id:'streak7', icon:'🌟', name:'৭ দিন ধারা',   cond:function(s){return s.streak>=7;},     tip:'১ সপ্তাহ streak!'},
  {id:'xp100',   icon:'💯', name:'১০০ XP',        cond:function(s){return s.xp>=100;},       tip:'১০০ XP অর্জন!'},
  {id:'xp500',   icon:'⚡', name:'৫০০ XP',        cond:function(s){return s.xp>=500;},       tip:'৫০০ XP অর্জন!'},
  {id:'quiz1',   icon:'📝', name:'প্রথম কুইজ',    cond:function(s){return s.quizzes>=1;},    tip:'প্রথম কুইজ দিলেন!'},
  {id:'quiz5',   icon:'🎯', name:'৫টি কুইজ',      cond:function(s){return s.quizzes>=5;},    tip:'৫টি কুইজ সম্পন্ন!'},
  {id:'speak1',  icon:'🎤', name:'প্রথম উচ্চারণ',  cond:function(s){return s.speaks>=1;},    tip:'প্রথম speaking test!'},
  {id:'ch1',     icon:'🏅', name:'অধ্যায় ১',      cond:function(s){return s.lessons>=7;},    tip:'অধ্যায় ১ শেষ!'},
  {id:'ch2',     icon:'🥈', name:'অধ্যায় ২',      cond:function(s){return s.lessons>=14;},   tip:'অধ্যায় ২ শেষ!'},
  {id:'ch3',     icon:'🥇', name:'অধ্যায় ৩',      cond:function(s){return s.lessons>=21;},   tip:'অধ্যায় ৩ শেষ!'},
  {id:'a1done',  icon:'🎓', name:'A1 সম্পন্ন',    cond:function(s){return s.lessons>=35;},   tip:'A1 শেষ!'}
];

// Mock leaderboard competitors (static AI opponents)
var LB_RIVALS = [
  {name:'Farhan (Dhaka)',   xp:280},
  {name:'Mitu (Berlin)',    xp:195},
  {name:'Arif (Hamburg)',   xp:150},
  {name:'Nadia (Köln)',     xp:90},
  {name:'Rahim (Frankfurt)',xp:45}
];

function getStats() {
  var xp = getXP();
  var streak = 0;
  try { streak = parseInt(localStorage.getItem(SK.streak)||'0'); } catch(e){}
  var prog = getProg();
  var lessons = Object.keys(prog).length;
  var quizzes = 0;
  var speaks = 0;
  try {
    var qkeys = Object.keys(prog).filter(function(k){return k.indexOf('q')>0 || k.slice(-1)==='q';});
    quizzes = qkeys.length;
    var skeys = Object.keys(prog).filter(function(k){return k.slice(-1)==='s';});
    speaks = skeys.length;
  } catch(e){}
  return {xp:xp, streak:streak, lessons:lessons, quizzes:quizzes, speaks:speaks};
}

function getLevel(xp) {
  var lvl = LEVELS[0];
  for (var i=0; i<LEVELS.length; i++) {
    if (xp >= LEVELS[i].min) lvl = LEVELS[i];
  }
  return lvl;
}

function getDailyXP() {
  try {
    var today = new Date().toISOString().slice(0,10);
    var savedDate = localStorage.getItem(SK_DAILY_DATE)||'';
    if (savedDate !== today) {
      localStorage.setItem(SK_DAILY, '0');
      localStorage.setItem(SK_DAILY_DATE, today);
      return 0;
    }
    return parseInt(localStorage.getItem(SK_DAILY)||'0');
  } catch(e){ return 0; }
}

function addDailyXP(n) {
  try {
    var today = new Date().toISOString().slice(0,10);
    var savedDate = localStorage.getItem(SK_DAILY_DATE)||'';
    var current = 0;
    if (savedDate === today) {
      current = parseInt(localStorage.getItem(SK_DAILY)||'0');
    } else {
      localStorage.setItem(SK_DAILY_DATE, today);
    }
    var newVal = current + n;
    localStorage.setItem(SK_DAILY, newVal);
    return newVal;
  } catch(e){ return n; }
}

function getEarnedBadges() {
  try { return JSON.parse(localStorage.getItem(SK_BADGES)||'[]'); } catch(e){ return []; }
}

function checkBadges() {
  var stats = getStats();
  var earned = getEarnedBadges();
  var newBadges = [];
  for (var i=0; i<BADGES.length; i++) {
    var b = BADGES[i];
    if (earned.indexOf(b.id) < 0 && b.cond(stats)) {
      earned.push(b.id);
      newBadges.push(b);
    }
  }
  if (newBadges.length > 0) {
    try { localStorage.setItem(SK_BADGES, JSON.stringify(earned)); } catch(e){}
    for (var j=0; j<newBadges.length; j++) {
      showBadgeToast(newBadges[j]);
    }
  }
  return earned;
}

function showBadgeToast(badge) {
  var t = document.getElementById('xpToast');
  if (!t) return;
  t.textContent = badge.icon + ' ব্যাজ পেলেন: ' + badge.name + '!';
  t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, 2500);
}

function showXPToast(n) {
  var t = document.getElementById('xpToast');
  if (!t) return;
  t.textContent = '+' + n + ' XP!';
  t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, 1500);
}

function buildBadgesGrid() {
  var grid = document.getElementById('badgesGrid');
  if (!grid) return;
  var earned = getEarnedBadges();
  var html = '';
  for (var i=0; i<BADGES.length; i++) {
    var b = BADGES[i];
    var isEarned = earned.indexOf(b.id) >= 0;
    html += '<div class="badge-card ' + (isEarned ? 'earned' : 'locked') + '" title="' + b.tip + '">';
    html += '<div class="badge-icon">' + b.icon + '</div>';
    html += '<div class="badge-name">' + b.name + '</div>';
    html += '</div>';
  }
  grid.innerHTML = html;
}

function buildLeaderboard() {
  var rows = document.getElementById('leaderboardRows');
  if (!rows) return;
  var myXP = getXP();
  var entries = [{name:'আপনি (Shajedur)', xp:myXP, isYou:true}];
  for (var i=0; i<LB_RIVALS.length; i++) {
    entries.push({name:LB_RIVALS[i].name, xp:LB_RIVALS[i].xp, isYou:false});
  }
  entries.sort(function(a,b){return b.xp - a.xp;});
  var maxXP = entries[0].xp || 1;
  var html = '';
  for (var j=0; j<entries.length; j++) {
    var e = entries[j];
    var rankClass = j===0 ? 'gold' : j===1 ? 'silver' : j===2 ? 'bronze' : '';
    var rankIcon = j===0 ? '🥇' : j===1 ? '🥈' : j===2 ? '🥉' : (j+1);
    var pct = Math.round((e.xp/maxXP)*100);
    html += '<div class="lb-row">';
    html += '<div class="lb-rank ' + rankClass + '">' + rankIcon + '</div>';
    html += '<div class="lb-name ' + (e.isYou?'you':'') + '">' + e.name + (e.isYou?' ★':'') + '</div>';
    html += '<div class="lb-bar"><div class="lb-bar-fill" style="width:' + pct + '%"></div></div>';
    html += '<div class="lb-xp-val">' + e.xp + ' XP</div>';
    html += '</div>';
  }
  rows.innerHTML = html;
}

function buildDailyGoal() {
  var daily = getDailyXP();
  var pct = Math.min(100, Math.round((daily/DAILY_GOAL)*100));
  var bar = document.getElementById('dgBar');
  var label = document.getElementById('dgXpLabel');
  var status = document.getElementById('dgStatus');
  if (bar) bar.style.width = pct + '%';
  if (label) label.textContent = daily + ' / ' + DAILY_GOAL + ' XP';
  if (status) {
    if (daily >= DAILY_GOAL) {
      status.className = 'dg-status done';
      status.textContent = '✅ আজকের লক্ষ্য পূরণ হয়েছে! চমৎকার! 🎉';
    } else {
      status.className = 'dg-status';
      var left = DAILY_GOAL - daily;
      status.textContent = 'আরও ' + left + ' XP অর্জন করুন — streak বাঁচিয়ে রাখুন! 🔥';
    }
  }
}

function buildStreakHero() {
  var streak = 0;
  try { streak = parseInt(localStorage.getItem(SK.streak)||'0'); } catch(e){}
  var daily = getDailyXP();
  var hero = document.getElementById('streakHero');
  var fire = document.getElementById('streakFire');
  var lbl = document.getElementById('streakLabel');
  var sh = document.getElementById('streakHome');
  var xpEl = document.getElementById('xpHome');
  var lvlEl = document.getElementById('levelLabel');
  var comeback = document.getElementById('comebackBanner');

  if (sh) sh.textContent = streak;
  if (xpEl) xpEl.textContent = getXP();

  var lvl = getLevel(getXP());
  if (lvlEl) lvlEl.textContent = lvl.icon + ' ' + lvl.name;

  // Check if streak was broken (last day not yesterday or today)
  var today = new Date().toISOString().slice(0,10);
  var yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
  var lastDay = '';
  try { lastDay = localStorage.getItem(SK.lastDay)||''; } catch(e){}

  var streakBroken = streak === 0 && lastDay !== '' && lastDay !== today && lastDay !== yesterday;
  var streakAtRisk = lastDay === yesterday && daily < DAILY_GOAL;
  var streakSafe = lastDay === today && daily >= DAILY_GOAL;

  if (comeback) comeback.className = streakBroken ? 'comeback show' : 'comeback';

  if (hero) {
    if (streakAtRisk && streak > 0) {
      hero.className = 'streak-hero streak-danger';
      if (fire) fire.textContent = '⚠️';
      if (lbl) lbl.textContent = 'Streak বিপদে! আজ পড়ুন!';
    } else if (streakSafe || daily >= DAILY_GOAL) {
      hero.className = 'streak-hero streak-safe';
      if (fire) fire.textContent = '🔥';
      if (lbl) lbl.textContent = streak + ' দিনের ধারা — চালিয়ে যান!';
    } else {
      hero.className = 'streak-hero';
      if (fire) fire.textContent = '🔥';
      if (lbl) lbl.textContent = 'দিনের ধারা (Streak)';
    }
  }
}

function refreshRewardUI() {
  buildStreakHero();
  buildDailyGoal();
  buildBadgesGrid();
  buildLeaderboard();
  checkBadges();
}

// Override addXP to also add daily XP and trigger reward check
var _origAddXP = addXP;
addXP = function(n) {
  _origAddXP(n);
  addDailyXP(n);
  showXPToast(n);
  buildDailyGoal();
  buildStreakHero();
  buildLeaderboard();
  checkBadges();
  buildBadgesGrid();
};

// Call refreshRewardUI whenever home is opened
var _origGo = go;
go = function(page, navId) {
  _origGo(page, navId);
  if (page === 'home') {
    setTimeout(refreshRewardUI, 50);
  }
};

// Init on load
setTimeout(refreshRewardUI, 100);

// ── NEW SKILL ENGINE ──────────────────────────────────────────────────────────

// Generic listening player for lesson pages
var lessonAudioPlays = {};

function playLessonAudio(id, script, maxPlays) {
  if (!lessonAudioPlays[id]) lessonAudioPlays[id] = 0;
  if (lessonAudioPlays[id] >= maxPlays) return;
  lessonAudioPlays[id]++;
  var btn  = document.getElementById('lap-btn-'  + id);
  var fill = document.getElementById('lap-fill-' + id);
  var cnt  = document.getElementById('lap-cnt-'  + id);
  if (btn)  { btn.classList.add('playing'); btn.textContent = '\u23f9'; }
  if (fill) { fill.style.width = '0%'; fill.style.transition = 'none'; }
  setTimeout(function() { if (fill) { fill.style.transition = 'width 4s linear'; fill.style.width = '100%'; } }, 50);
  if (cnt) cnt.textContent = lessonAudioPlays[id] + '/' + maxPlays;
  tts(script);
  setTimeout(function() {
    if (btn) {
      btn.classList.remove('playing');
      if (lessonAudioPlays[id] >= maxPlays) { btn.classList.add('done'); btn.textContent = '\u2705'; }
      else btn.textContent = '\u25b6\ufe0f';
    }
  }, 4200);
}

// Generic lesson MCQ answer checker
function ansLessonMCQ(pageId, qi, chosen, correct, feedback_ok, feedback_no) {
  var opts = document.querySelectorAll('#' + pageId + '-opts-' + qi + ' .qo');
  for (var i = 0; i < opts.length; i++) {
    opts[i].disabled = true;
    if (i === correct) opts[i].classList.add('ok');
    else if (i === chosen) opts[i].classList.add('no');
  }
  var fb = document.getElementById(pageId + '-fb-' + qi);
  if (fb) {
    fb.className = chosen === correct ? 'q-fb show ok' : 'q-fb show no';
    fb.textContent = chosen === correct ? ('\u2705 ' + feedback_ok) : ('\u274c ' + feedback_no);
  }
  if (chosen === correct) addXP(5);
}

// Generic lesson TF answer checker
function ansLessonTF(pageId, qi, picked, correct, exp) {
  var rb = document.querySelector('#' + pageId + '-tf-' + qi + ' button:first-child');
  var fb2 = document.querySelector('#' + pageId + '-tf-' + qi + ' button:last-child');
  if (rb)  { rb.disabled  = true; rb.classList.add('locked');  }
  if (fb2) { fb2.disabled = true; fb2.classList.add('locked'); }
  if (correct === true)  { if (rb) rb.classList.add('richtig');  if (!( picked===true)  && fb2) fb2.classList.add('wrong-pick'); }
  if (correct === false) { if (fb2) fb2.classList.add('falsch'); if (!(picked===false) && rb)  rb.classList.add('richtig'); }
  var fb = document.getElementById(pageId + '-fb-' + qi);
  if (fb) { fb.className = (picked===correct) ? 'q-fb show ok' : 'q-fb show no'; fb.textContent = exp; }
  if (picked === correct) addXP(5);
}

// Word counter for free writing lessons
function lessonWriteCount(ta, wcId) {
  var words = ta.value.trim() === '' ? 0 : ta.value.trim().split(/\s+/).length;
  var el = document.getElementById(wcId);
  if (!el) return;
  el.textContent = words + ' \u09b6\u09ac\u09cd\u09a6';
  el.style.background = words >= 5 ? '#edfaf3' : '#fdf0ef';
  el.style.color      = words >= 5 ? 'var(--green)' : 'var(--red)';
}

// Generic free writing checker
function checkLessonWrite(pageId, minWords, sampleAnswer) {
  var ta = document.getElementById(pageId + '-write');
  var res = document.getElementById(pageId + '-write-res');
  if (!ta || !res) return;
  var words = ta.value.trim() === '' ? 0 : ta.value.trim().split(/\s+/).length;
  res.style.display = 'block';
  if (words >= minWords) {
    res.style.background = '#edfaf3'; res.style.border = '1px solid #a8e6c0';
    res.innerHTML = '<strong style="color:var(--green)">✅ দারুণ! Sehr gut!</strong> ' + words + ' শব্দ লিখেছ৅ন!<br><span style="font-family:var(--bn);font-size:.78rem;color:#555">নমুনা: <em>' + sampleAnswer + '</em></span>';
    addXP(10);
  } else {
    res.style.background = '#fdf0ef'; res.style.border = '1px solid #f0b0a8';
    res.innerHTML = '<span style="font-family:var(--bn);font-size:.8rem;color:var(--red)">❌ आরো লিখুন! কমপক্ষে ' + minWords + ' শব্দ লিখতে হবে। এখন পর্যন্ত: ' + words + ' শব্দ</span>';
  }
}

// Generic spontaneous speaking for lesson pages
var lessonSpeechRec = null;
function startLessonSpeak(btnId, resId, keyWords, sampleAnswer) {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    var res = document.getElementById(resId);
    if (res) { res.style.display='block'; res.style.background='#fff8e6'; res.innerHTML='\u26a0\ufe0f Chrome \u09ac\u09cd\u09af\u09ac\u09b9\u09be\u09b0 \u0995\u09b0\u09c1\u09a8 \u09ae\u09be\u0987\u0995\u09c7\u09b0 \u099c\u09a8\u09cd\u09af\u0964'; }
    addXP(5);
    return;
  }
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (lessonSpeechRec) { try { lessonSpeechRec.stop(); } catch(e) {} }
  lessonSpeechRec = new SR();
  lessonSpeechRec.lang = 'de-DE'; lessonSpeechRec.continuous = false; lessonSpeechRec.interimResults = false;
  var btn = document.getElementById(btnId);
  var res = document.getElementById(resId);
  if (btn) { btn.classList.add('on'); btn.textContent = '\U0001f534 \u09b0\u09c7\u0995\u09b0\u09cd\u09a1...'; }
  if (res) { res.style.display='block'; res.style.background='#fff8e6'; res.textContent='\U0001f3a4 \u09b6\u09c1\u09a8\u099b\u09bf... \u09a6\u09af\u09bc\u09be \u0995\u09b0\u09c7 \u09ac\u09b2\u09c1\u09a8!'; }
  lessonSpeechRec.onresult = function(ev) {
    var t = ev.results[0][0].transcript.toLowerCase();
    var keys = keyWords.toLowerCase().split(' ');
    var matched = 0;
    for (var k = 0; k < keys.length; k++) { if (t.indexOf(keys[k]) >= 0) matched++; }
    var pass = matched >= 1;
    if (btn) { btn.classList.remove('on'); btn.textContent = '\U0001f3a4 \u0986\u09ac\u09be\u09b0 \u09ac\u09b2\u09c1\u09a8'; }
    if (res) {
      res.style.background = pass ? '#edfaf3' : '#fdf0ef';
      res.innerHTML = '<strong style="color:' + (pass?'var(--green)':'var(--red)') + '">' + (pass?'\u2705 Sehr gut!':'\u274c \u0986\u09ac\u09be\u09b0 \u099a\u09c7\u09b7\u09cd\u099f\u09be \u0995\u09b0\u09c1\u09a8') + '</strong><br>\u201e' + t + '\u201c<br><span style="font-size:.74rem;color:#888">\u09a8\u09ae\u09c1\u09a8\u09be: <em>' + sampleAnswer + '</em></span>';
    }
    if (pass) addXP(10);
  };
  lessonSpeechRec.onerror = function() {
    if (btn) { btn.classList.remove('on'); btn.textContent = '\U0001f3a4 \u0986\u09ac\u09be\u09b0 \u09a6\u09bf\u09a8'; }
    if (res) { res.style.background='#fdf0ef'; res.textContent='\u26a0\ufe0f \u09ad\u09c1\u09b2 \u09b9\u09b2\u09cb — \u0986\u09ac\u09be\u09b0 \u099a\u09c7\u09b7\u09cd\u099f\u09be \u0995\u09b0\u09c1\u09a8\u0964'; }
  };
  lessonSpeechRec.onend = function() { if (btn) btn.classList.remove('on'); };
  lessonSpeechRec.start();
}
