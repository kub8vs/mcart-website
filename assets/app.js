(function(){
  "use strict";
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function(s,r){return (r||document).querySelector(s)};
  var $$ = function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
  var pad = function(n){return n<10?'0'+n:''+n};

  /* logo (preview build injects data URI) */
  if (window.__LOGO) $$('img[data-logo]').forEach(function(i){i.src=window.__LOGO});
  $$('[data-year]').forEach(function(e){e.textContent=new Date().getFullYear()});

  /* ---------- inertial smooth scroll (desktop wheel only; touch keeps native momentum) ---------- */
  var FINE = window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches;
  var SS=(function(){
    if(RM||!FINE)return null;
    document.documentElement.classList.add('ss');
    var cur=scrollY,tgt=scrollY,raf=null,EASE=.085;
    var max=function(){return document.documentElement.scrollHeight-innerHeight};
    var loop=function(){cur+=(tgt-cur)*EASE;if(Math.abs(tgt-cur)<.4){cur=tgt;scrollTo(0,cur);raf=null;return}scrollTo(0,cur);raf=requestAnimationFrame(loop)};
    var inner=function(el,dy){while(el&&el.nodeType===1&&el!==document.body){var cs=getComputedStyle(el);if(/(auto|scroll)/.test(cs.overflowY)&&el.scrollHeight>el.clientHeight+1){if(dy>0&&el.scrollTop+el.clientHeight<el.scrollHeight-1)return true;if(dy<0&&el.scrollTop>0)return true}el=el.parentElement}return false};
    addEventListener('wheel',function(e){
      if(e.ctrlKey||e.defaultPrevented||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
      if(document.body.style.overflow==='hidden'||inner(e.target,e.deltaY))return;
      e.preventDefault();
      var d=e.deltaY*(e.deltaMode===1?40:e.deltaMode===2?innerHeight:1);
      if(!raf){cur=scrollY;tgt=scrollY}
      tgt=Math.max(0,Math.min(max(),tgt+d));
      if(!raf)raf=requestAnimationFrame(loop);
    },{passive:false});
    addEventListener('scroll',function(){if(!raf){cur=tgt=scrollY}},{passive:true});
    return {to:function(y,imm){y=Math.max(0,Math.min(max(),y));if(imm){if(raf){cancelAnimationFrame(raf);raf=null}cur=tgt=y;scrollTo(0,y);return}if(!raf)cur=scrollY;tgt=y;if(!raf)raf=requestAnimationFrame(loop)}};
  })();
  var HDR=96;
  var scrollToY=function(y,imm){if(SS)SS.to(y,imm);else scrollTo({top:y,behavior:imm||RM?'auto':'smooth'})};
  var scrollToEl=function(el,imm){var y=el.getBoundingClientRect().top+scrollY-HDR-(document.querySelector('.subnav')&&!el.closest('.subnav')?56:0);scrollToY(y,imm)};

  /* ---------- scroll-driven layer: progress, header, parallax, timeline ---------- */
  var top=$('.top'),prog=document.createElement('div');prog.className='progress';prog.setAttribute('aria-hidden','true');document.body.appendChild(prog);
  var totop=$('.totop');
  var lastY=scrollY,ticking=false;
  function frame(){
    ticking=false;
    var y=scrollY,h=document.documentElement.scrollHeight-innerHeight,p=h>0?y/h:0;
    document.documentElement.style.setProperty('--sp',p.toFixed(4));
    if(top){
      top.classList.toggle('scrolled',y>8);
      var hide=y>420&&y>lastY+2&&!document.querySelector('.dd.open');
      if(y<lastY-2||y<420)hide=false;
      if(hide!==top.classList.contains('hide')&&Math.abs(y-lastY)>2){top.classList.toggle('hide',hide);document.body.classList.toggle('hdr-hidden',hide)}
    }
    if(totop)totop.classList.toggle('on',y>700);
    lastY=y;
    if(RM){$$('.ekg').forEach(function(ek){ek.style.setProperty('--ep',1);$$('.beat',ek).forEach(function(b){b.classList.add('on')})});return}
    var vh=innerHeight;
    $$('[data-par]').forEach(function(el){
      if(el.offsetParent===null)return;
      var r=el.getBoundingClientRect();if(r.bottom<-200||r.top>vh+200)return;
      var c=(r.top+r.height/2-vh/2);el.style.transform='translate3d(0,'+(-c*parseFloat(el.dataset.par)).toFixed(1)+'px,0)';
    });
    $$('.ekg').forEach(function(ek){
      if(ek.offsetParent===null)return;
      var mon=$('.ekg-monitor',ek),tr=$('.ekg-track',ek);if(!tr)return;
      if(!ek._len){ek._len=tr.getTotalLength();ek.style.setProperty('--len',ek._len.toFixed(1));ek._beats=$$('.beat',ek)}
      var r=mon.getBoundingClientRect(),q=Math.max(0,Math.min(1,(vh*.82-r.top)/(vh*.62)));
      ek.style.setProperty('--ep',q.toFixed(4));
      var pt=tr.getPointAtLength(ek._len*q);
      ek.style.setProperty('--dx',(pt.x/12).toFixed(2)+'%');ek.style.setProperty('--dy',(pt.y/2).toFixed(2)+'%');ek.style.setProperty('--eo',q>0&&q<1?1:0);
      ek._beats.forEach(function(b,i){b.classList.toggle('on',pt.x>=150+i*300-4||q>=1)});
    });
    $$('.tl').forEach(function(tl){
      if(tl.offsetParent===null)return;
      var r=tl.getBoundingClientRect(),q=Math.max(0,Math.min(1,(vh*.85-r.top)/(r.height+vh*.35)));
      tl.style.setProperty('--tp',q.toFixed(3));
      var lis=$$('li',tl);lis.forEach(function(li,i){li.classList.toggle('lit',q>=(i+.5)/lis.length)});
    });
  }
  var onScroll=function(){if(!ticking){ticking=true;requestAnimationFrame(frame)}};
  addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll);frame();
  if(totop)totop.addEventListener('click',function(){scrollToY(0)});

  /* in-page anchors glide with the same inertia */
  document.addEventListener('click',function(e){
    var a=e.target.closest('a[href]');if(!a||window.__PREVIEW&&/\.html/.test(a.getAttribute('href')))return;
    var href=a.getAttribute('href'),m=href.match(/^(?:([a-z0-9-]+\.html))?#([\w-]+)$/);if(!m)return;
    var here=(location.pathname.split('/').pop()||'index.html');
    if(m[1]&&m[1]!==here)return;
    var t=document.getElementById(m[2]);if(!t)return;
    e.preventDefault();scrollToEl(t);
  });

  /* dropdown */
  $$('.dd').forEach(function(dd){
    var b=$('button',dd), t;
    var open=function(v){dd.classList.toggle('open',v);b.setAttribute('aria-expanded',String(v))};
    b.addEventListener('click',function(e){e.stopPropagation();open(!dd.classList.contains('open'))});
    dd.addEventListener('mouseenter',function(){clearTimeout(t);open(true)});
    dd.addEventListener('mouseleave',function(){t=setTimeout(function(){open(false)},160)});
    document.addEventListener('click',function(){open(false)});
    dd.addEventListener('keydown',function(e){if(e.key==='Escape'){open(false);b.focus()}});
  });

  /* mobile menu */
  var mb=$('#menuBtn'), mn=$('#mnav');
  if(mb&&mn){
    var setM=function(v){mn.hidden=!v;mb.setAttribute('aria-expanded',String(v));document.body.style.overflow=v?'hidden':''; if(v) $('button',mn).focus()};
    mb.addEventListener('click',function(){setM(true)});
    $('#mnavClose').addEventListener('click',function(){setM(false);mb.focus()});
    mn.addEventListener('click',function(e){if(e.target.closest('a'))setM(false)});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!mn.hidden)setM(false)});
  }

  /* reveal: only things below the first screen get hidden, so nothing is ever parked invisible at load */
  function setupReveal(root){
    var els=$$('.rv',root);
    if(RM||!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.remove('rv')});return}
    var vh=innerHeight;
    var io=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:.08});
    els.forEach(function(e,i){
      var r=e.getBoundingClientRect();
      if(r.top<vh*0.95 && r.bottom>0 && r.width){e.classList.remove('rv');return}
      var sib=e.parentElement?[].indexOf.call(e.parentElement.children,e):0;
      e.style.transitionDelay=Math.min(sib,8)*85+'ms';
      io.observe(e);
    });
  }

  /* count-up (shows final value at rest; animates when it scrolls into view) */
  function setupCount(root){
    var els=$$('[data-count]',root); if(RM||!els.length||!('IntersectionObserver' in window))return;
    var io=new IntersectionObserver(function(en){en.forEach(function(x){
      if(!x.isIntersecting)return; io.unobserve(x.target);
      var el=x.target,to=+el.dataset.count,t0=null,d=1400;
      var step=function(t){t0=t0||t;var p=Math.min(1,(t-t0)/d);el.textContent=Math.round(to*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(step)};
      el.textContent='0';requestAnimationFrame(step);
    })},{threshold:.6});
    els.forEach(function(e){io.observe(e)});
  }

  /* bars (WeroNET) */
  function setupBars(root){
    var bars=$$('.bar .t i',root); if(!bars.length)return;
    var go=function(i){i.style.width=i.dataset.w};
    if(RM||!('IntersectionObserver' in window)){bars.forEach(go);return}
    var io=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){$$('.t i',x.target).forEach(go);io.unobserve(x.target)}})},{threshold:.3});
    $$('.bars',root).forEach(function(b){io.observe(b)});
  }

  /* SOR boards */
  var C={r:'var(--t-red)',o:'var(--t-orange)',y:'var(--t-yellow)',g:'var(--t-green)',b:'var(--t-blue)'};
  var MAX={r:0,o:10,y:60,g:120,b:240};
  var SAMPLE=[['P-0418','o','Konsultacja chirurgiczna',7],['P-0412','y','Badania laboratoryjne',41],['P-0409','y','RTG klatki piersiowej',63],['P-0421','g','Oczekuje na lekarza',18],['P-0403','g','Tomografia komputerowa',96],['P-0399','b','Oczekuje na lekarza',132]];
  var boards=[];
  $$('.board').forEach(function(bd){
    var host=$('.board-rows',bd),n=+host.dataset.rows||6,now=Date.now();
    var pts=SAMPLE.slice(0,n).map(function(p){return {id:p[0],t:p[1],st:p[2],since:now-p[3]*60000-Math.floor(Math.random()*50000)}});
    host.innerHTML=pts.map(function(p){var mx=MAX[p.t]>=60?(MAX[p.t]/60)+' h':MAX[p.t]+' min';return '<div class="board-row"><span class="tri" style="background:'+C[p.t]+'"></span><span>'+p.id+'</span><span class="dep">'+p.st+'</span><span class="el"></span><span class="mx">'+mx+'</span></div>'}).join('');
    boards.push({el:bd,rows:$$('.board-row',host),pts:pts,clock:$('.board-clock',bd)});
  });
  function tickBoards(){
    var d=new Date(),t=Date.now(),clk=pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
    boards.forEach(function(b){
      b.clock.textContent=clk;
      b.rows.forEach(function(r,i){var p=b.pts[i],s=Math.floor((t-p.since)/1000),m=Math.floor(s/60),h=Math.floor(m/60);
        r.querySelector('.el').textContent=(h?h+':'+pad(m%60):m)+':'+pad(s%60);
        r.classList.toggle('late',MAX[p.t]>0&&m>=MAX[p.t])});
    });
  }
  if(boards.length){tickBoards();setInterval(tickBoards,1000)}

  /* product showcase auto-cycle */
  var ptabs=$$('.ptab');
  if(ptabs.length){
    var idx=0,timer=null,DUR=7000,paused=false;
    var show=function(i,user){
      idx=i;
      ptabs.forEach(function(t,k){t.setAttribute('aria-selected',String(k===i));t.tabIndex=k===i?0:-1;var pr=$('.prog',t);if(pr){pr.style.animation='none';pr.offsetWidth;pr.style.animation=''}});
      var key=ptabs[i].dataset.p;
      $$('.pv').forEach(function(p){p.hidden=p.dataset.p!==key});
      setupBars($('#pv'));
      clearTimeout(timer);
      if(!RM&&!user&&!paused) timer=setTimeout(function(){show((idx+1)%ptabs.length)},DUR);
      if(user){ptabs.forEach(function(t){var pr=$('.prog',t);if(pr)pr.style.animationPlayState='paused'})}
    };
    ptabs.forEach(function(t,i){
      t.style.setProperty('--dur',DUR+'ms');
      t.addEventListener('click',function(e){if(e.target.closest('a'))return;paused=true;show(i,true)});
      t.addEventListener('keydown',function(e){var n=null;if(e.key==='ArrowDown'||e.key==='ArrowRight')n=(i+1)%ptabs.length;if(e.key==='ArrowUp'||e.key==='ArrowLeft')n=(i-1+ptabs.length)%ptabs.length;if(n!==null){e.preventDefault();paused=true;show(n,true);ptabs[n].focus()}});
    });
    var sc=$('.showcase');
    if(sc&&'IntersectionObserver' in window){new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting&&!paused)show(idx);else clearTimeout(timer)})},{threshold:.3}).observe(sc)}
    else show(0);
  }

  /* steps highlight cycle (home) */
  var hs=$('#homeSteps');
  if(hs&&!RM){var li=$$('li',hs),k=0;setInterval(function(){li.forEach(function(l,j){l.classList.toggle('on',j===k)});k=(k+1)%li.length},2200)}

  /* testimonials carousel */
  $$('.tst-nav button').forEach(function(b){
    b.addEventListener('click',function(){
      var tr=$('.tst-track');if(!tr)return;var card=$('.tst-card',tr);var w=card?card.getBoundingClientRect().width+20:300;
      var max=tr.scrollWidth-tr.clientWidth-4;
      var dir=+b.dataset.dir;
      if(dir>0&&tr.scrollLeft>=max) tr.scrollTo({left:0,behavior:'smooth'});
      else if(dir<0&&tr.scrollLeft<=4) tr.scrollTo({left:max,behavior:'smooth'});
      else tr.scrollBy({left:dir*w,behavior:'smooth'});
    });
  });

  /* card glow follows the cursor */
  $$('.card').forEach(function(c){c.addEventListener('pointermove',function(e){var r=c.getBoundingClientRect();c.style.setProperty('--mx',(e.clientX-r.left)+'px');c.style.setProperty('--my',(e.clientY-r.top)+'px')})});

  /* marquee: duplicate content for a seamless loop */
  $$('.marquee-inner').forEach(function(m){m.innerHTML+=m.innerHTML;$$('span',m).slice(m.children.length/2).forEach(function(s){s.setAttribute('aria-hidden','true')})});

  /* subnav active section */
  var sn=$$('.subnav a');
  if(sn.length&&'IntersectionObserver' in window){
    var map={};sn.forEach(function(a){map[a.getAttribute('href').slice(1)]=a});
    var io2=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){sn.forEach(function(a){a.classList.remove('on')});var a=map[x.target.id];if(a){a.classList.add('on');a.scrollIntoView({block:'nearest',inline:'nearest'})}}})},{rootMargin:'-40% 0px -55% 0px'});
    Object.keys(map).forEach(function(id){var s=document.getElementById(id);if(s)io2.observe(s)});
  }

  /* network hero */
  var net=$('#net');
  if(net){
    var cv=$('canvas',net),ctx=cv.getContext('2d'),tip=$('.net-tip',net);
    var nodes=$$('.node:not(.hub)',net);
    var W,H,DPR,hot=null,mx=0,my=0;
    var links=[];
    nodes.forEach(function(n,i){links.push({a:-1,b:i});});
    [['his','pharma'],['his','wero'],['his','sor'],['erp','pharma'],['srv','sec'],['his','erp']].forEach(function(p){
      var a=nodes.findIndex(function(n){return n.dataset.id===p[0]}),b=nodes.findIndex(function(n){return n.dataset.id===p[1]});
      if(a>=0&&b>=0)links.push({a:a,b:b,cross:true});
    });
    var packets=[];
    links.forEach(function(l,i){var c=l.cross?1:2;for(var k=0;k<c;k++)packets.push({l:i,t:Math.random(),s:.0025+Math.random()*.003,dir:Math.random()<.5?1:-1})});
    var pos=function(i){if(i<0)return {x:W*.5,y:H*.5};var n=nodes[i];return {x:parseFloat(n.style.left)/100*W,y:parseFloat(n.style.top)/100*H}};
    var ctrl=function(p,q,cross){var mxp=(p.x+q.x)/2,myp=(p.y+q.y)/2,dx=q.x-p.x,dy=q.y-p.y,k=cross?.22:.12;return {x:mxp-dy*k,y:myp+dx*k}};
    var bez=function(p,c,q,t){var u=1-t;return {x:u*u*p.x+2*u*t*c.x+t*t*q.x,y:u*u*p.y+2*u*t*c.y+t*t*q.y}};
    function size(){var r=net.getBoundingClientRect();DPR=Math.min(2,devicePixelRatio||1);W=r.width;H=r.height;cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);
      var vw=document.documentElement.clientWidth;nodes.forEach(function(n){n.style.marginLeft='0px';var b=n.getBoundingClientRect(),m=0;if(b.right>vw-8)m=vw-8-b.right;if(b.left+m<8)m=8-b.left;if(m)n.style.marginLeft=m+'px'})}
    function draw(){
      if(!W){size()}
      ctx.clearRect(0,0,W,H);
      // orbit rings
      ctx.save();ctx.translate(W/2+mx*6,H/2+my*6);
      for(var r=0;r<3;r++){ctx.beginPath();ctx.ellipse(0,0,W*(.2+r*.14),H*(.17+r*.13),0,0,Math.PI*2);ctx.strokeStyle='rgba(26,50,116,'+(.08-r*.02)+')';ctx.setLineDash(r===1?[3,6]:[]);ctx.lineWidth=1;ctx.stroke()}
      ctx.restore();ctx.setLineDash([]);
      links.forEach(function(l){
        var p=pos(l.a),q=pos(l.b),c=ctrl(p,q,l.cross);
        var on=hot!==null&&(l.a===hot||l.b===hot||(!l.cross&&hot===-1));
        var g=ctx.createLinearGradient(p.x,p.y,q.x,q.y);
        g.addColorStop(0,on?'rgba(31,86,224,.75)':'rgba(31,86,224,.30)');g.addColorStop(1,on?'rgba(124,196,255,.8)':'rgba(124,196,255,.35)');
        ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo(c.x,c.y,q.x,q.y);ctx.strokeStyle=g;ctx.lineWidth=on?2:(l.cross?1:1.4);
        if(l.cross)ctx.setLineDash([4,5]);ctx.stroke();ctx.setLineDash([]);
      });
      packets.forEach(function(k){
        var l=links[k.l],p=pos(l.a),q=pos(l.b),c=ctrl(p,q,l.cross);
        if(!RM){k.t+=k.s*k.dir;if(k.t>1)k.t=0;if(k.t<0)k.t=1}
        var b=bez(p,c,q,k.t),on=hot!==null&&(l.a===hot||l.b===hot);
        var rad=on?4:3;
        var gl=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,rad*4);gl.addColorStop(0,'rgba(59,123,255,.55)');gl.addColorStop(1,'rgba(59,123,255,0)');
        ctx.fillStyle=gl;ctx.beginPath();ctx.arc(b.x,b.y,rad*4,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=on?'#1f56e0':'#3b7bff';ctx.beginPath();ctx.arc(b.x,b.y,rad,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(b.x,b.y,rad*.4,0,Math.PI*2);ctx.fill();
      });
      if(!RM&&netVis)requestAnimationFrame(draw);
    }
    var netVis=true;
    size();
    if('ResizeObserver' in window) new ResizeObserver(function(){size();if(RM)draw()}).observe(net); else addEventListener('resize',size);
    draw();
    if('IntersectionObserver' in window)new IntersectionObserver(function(en){var v=en[0].isIntersecting;if(v&&!netVis){netVis=true;draw()}else netVis=v}).observe(net);
    nodes.forEach(function(n,i){
      var on=function(){hot=i;n.classList.add('hot');var r=net.getBoundingClientRect(),nr=n.getBoundingClientRect();
        tip.innerHTML='<b>'+$('b',n).textContent+'</b>'+n.dataset.tip;tip.classList.add('on');
        var x=nr.left-r.left+nr.width/2-125, y=nr.bottom-r.top+10;
        x=Math.max(0,Math.min(x,r.width-250)); if(y+120>r.height) y=nr.top-r.top-tip.offsetHeight-10;
        tip.style.left=x+'px';tip.style.top=y+'px';if(RM)draw()};
      var off=function(){hot=null;n.classList.remove('hot');tip.classList.remove('on');if(RM)draw()};
      n.addEventListener('mouseenter',on);n.addEventListener('mouseleave',off);n.addEventListener('focus',on);n.addEventListener('blur',off);
    });
    if(!RM)net.addEventListener('pointermove',function(e){var r=net.getBoundingClientRect();mx=(e.clientX-r.left)/r.width-.5;my=(e.clientY-r.top)/r.height-.5});
  }

  /* CTA particles */
  $$('.cta-fx').forEach(function(cv){
    var ctx=cv.getContext('2d'),W,H,pts=[];
    function size(){var r=cv.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);W=r.width;H=r.height;cv.width=W*d;cv.height=H*d;ctx.setTransform(d,0,0,d,0,0);
      pts=[];for(var i=0;i<Math.round(W*H/9000);i++)pts.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25})}
    function frame(){ctx.clearRect(0,0,W,H);
      for(var i=0;i<pts.length;i++){var p=pts[i];if(!RM){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<0||p.y>H)p.vy*=-1}
        for(var j=i+1;j<pts.length;j++){var q=pts[j],dx=p.x-q.x,dy=p.y-q.y,d=dx*dx+dy*dy;if(d<12000){ctx.strokeStyle='rgba(124,196,255,'+(.22*(1-d/12000))+')';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()}}
        ctx.fillStyle='rgba(180,215,255,.7)';ctx.beginPath();ctx.arc(p.x,p.y,1.4,0,Math.PI*2);ctx.fill()}
      if(!RM&&vis)requestAnimationFrame(frame)}
    var vis=false;size();frame();
    if('ResizeObserver' in window)new ResizeObserver(function(){size();frame()}).observe(cv);
    if('IntersectionObserver' in window)new IntersectionObserver(function(en){var v=en[0].isIntersecting;if(v&&!vis){vis=true;frame()}else vis=v}).observe(cv);
  });

  /* copy buttons */
  $$('.copy').forEach(function(b){b.addEventListener('click',function(){
    var v=b.dataset.copy,done=function(){b.textContent='Skopiowano';setTimeout(function(){b.textContent='Kopiuj'},1600)};
    var fb=function(){var a=b.previousElementSibling,r=document.createRange();r.selectNodeContents(a);var s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent='Zaznaczono'};
    try{navigator.clipboard.writeText(v).then(done,fb)}catch(e){fb()}
  })});

  /* contact form */
  var f=$('#contactForm');
  if(f){
    var st=$('#formStatus'),btn=$('#sendBtn'),btnHTML=btn.innerHTML;
    var msgs={name:'Podaj imię i nazwisko.',email:'Podaj adres e-mail, na który mamy odpisać.',message:'Napisz, w czym możemy pomóc.'};
    var check=function(inp){var w=inp.closest('.f'),e=$('.err-msg',w),ok=true,m='';
      if(inp.required&&!inp.value.trim()){ok=false;m=msgs[inp.name]}
      else if(inp.type==='email'&&inp.value&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(inp.value)){ok=false;m='Ten adres wygląda na niepełny, np. jan.kowalski@szpital.pl.'}
      w.classList.toggle('invalid',!ok);if(e)e.textContent=m;return ok};
    $$('.f input[required],.f textarea[required]',f).forEach(function(i){i.addEventListener('blur',function(){check(i)})});
    f.addEventListener('submit',function(ev){
      ev.preventDefault();st.textContent='';st.className='status';
      var ok=true,first=null;
      $$('.f input[required],.f textarea[required]',f).forEach(function(i){if(!check(i)){ok=false;first=first||i}});
      var c=$('#f-consent');c.closest('.consent').classList.toggle('invalid',!c.checked);if(!c.checked){ok=false;first=first||c}
      if(!ok){st.textContent='Uzupełnij zaznaczone pola.';st.className='status bad';first.focus();return}
      btn.disabled=true;btn.textContent='Wysyłanie…';
      fetch(f.getAttribute('action'),{method:'POST',body:new URLSearchParams(new FormData(f)),headers:{'Accept':'application/json'}})
        .then(function(r){return r.json().catch(function(){return {ok:false}}).then(function(j){if(!r.ok||!j.ok)throw 0})})
        .then(function(){try{window.va&&window.va('event',{name:'Formularz wysłany',data:{temat:(new FormData(f)).get('topic')||''}})}catch(e){}f.reset();st.textContent='Wiadomość wysłana. Odpowiemy w ciągu jednego dnia roboczego.';st.className='status ok'})
        .catch(function(){st.textContent='Nie udało się wysłać wiadomości. Zadzwoń pod 42 636 55 94 albo napisz na biuro@mcart.com.pl.';st.className='status bad'})
        .then(function(){btn.disabled=false;btn.innerHTML=btnHTML});
    });
  }


  /* ---------- headline word reveal ---------- */
  function setupSplit(root){
    var hs=$$('.sec-head h2, .cta h2, .phero h1, .svc-block h2, .split > div > h2, .split > .rv > h2',root).filter(function(h){return !h.dataset.split});
    if(RM||!('IntersectionObserver' in window))return;
    var io=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{threshold:.2});
    hs.forEach(function(h){
      h.dataset.split='1';h.setAttribute('aria-label',h.textContent.trim());
      var i=0;
      var walk=function(node){
        [].slice.call(node.childNodes).forEach(function(n){
          if(n.nodeType===3){
            var frag=document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(function(w){
              if(!w)return;
              if(/^\s+$/.test(w)){frag.appendChild(document.createTextNode(' '));return}
              var o=document.createElement('span');o.className='w';o.setAttribute('aria-hidden','true');
              var s2=document.createElement('span');s2.textContent=w;s2.style.transitionDelay=(i++*55)+'ms';o.appendChild(s2);frag.appendChild(o);
            });
            n.parentNode.replaceChild(frag,n);
          } else if(n.nodeType===1&&n.tagName!=='BR') walk(n);
        });
      };
      walk(h);h.classList.add('wsplit');
      var r=h.getBoundingClientRect();
      if(r.top<innerHeight&&r.bottom>0)requestAnimationFrame(function(){requestAnimationFrame(function(){h.classList.add('in')})});
      else io.observe(h);
    });
  }

  /* ---------- 3D tilt on cards ---------- */
  if(FINE&&!RM){
    $$('.card, .tst-card, .dept, .ptab, .partner').forEach(function(c){
      c.classList.add('tilt');
      c.addEventListener('pointermove',function(e){
        var r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
        c.classList.add('tilting');
        c.style.transform='perspective(900px) rotateX('+(-y*6).toFixed(2)+'deg) rotateY('+(x*7).toFixed(2)+'deg) translateY(-4px)';
      });
      c.addEventListener('pointerleave',function(){c.classList.remove('tilting');c.style.transform=''});
    });
    /* magnetic primary buttons */
    $$('.btn-primary, .btn-light, .tst-nav button, .cta-phone').forEach(function(b){
      b.addEventListener('pointermove',function(e){var r=b.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;b.style.transform='translate('+(x*.18).toFixed(1)+'px,'+(y*.28).toFixed(1)+'px)'});
      b.addEventListener('pointerleave',function(){b.style.transform=''});
    });
    /* hero spotlight follows the cursor */
    $$('.hero').forEach(function(h){
      var sp=$('.spot',h);if(!sp)return;
      h.addEventListener('pointermove',function(e){var r=h.getBoundingClientRect();sp.style.setProperty('--hx',(e.clientX-r.left)+'px');sp.style.setProperty('--hy',(e.clientY-r.top)+'px')});
    });
  }


  /* ---------- wayfinding sign ---------- */
  $$('.sign-wrap').forEach(function(w){
    var rows=$$('.sign-row',w),panels=$$('.sign-detail',w);
    var act=function(k){rows.forEach(function(r){r.classList.toggle('on',r.dataset.k===k)});panels.forEach(function(p){p.hidden=p.dataset.k!==k})};
    rows.forEach(function(r){r.addEventListener('pointerenter',function(){act(r.dataset.k)});r.addEventListener('focus',function(){act(r.dataset.k)})});
    if(rows[0])act(rows[0].dataset.k);
  });


  /* ---------- booking widget (Google Calendar via /api when available, demo otherwise) ---------- */
  var bw=$('#bookingWidget');
  if(bw){
    var API=false,AVAIL={};
    var DN=['nd','pn','wt','śr','czw','pt','sb'],DF=['niedziela','poniedziałek','wtorek','środa','czwartek','piątek','sobota'];
    var MN=['stycznia','lutego','marca','kwietnia','maja','czerwca','lipca','sierpnia','września','października','listopada','grudnia'];
    var MF=['styczeń','luty','marzec','kwiecień','maj','czerwiec','lipiec','sierpień','wrzesień','październik','listopad','grudzień'];
    var TIMES=['9:00','9:30','10:00','10:30','11:00','11:30','12:30','13:00','13:30','14:00','14:30','15:00'];
    var hash=function(str){var h=2166136261;for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
    var key=function(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
    var today=new Date();today.setHours(0,0,0,0);
    var first=new Date(today);first.setDate(first.getDate()+1);
    var monday=function(d){var x=new Date(d);var k=(x.getDay()+6)%7;x.setDate(x.getDate()-k);return x};
    var week0=monday(first),week=0,selDay=null,selTime=null;
    var daysEl=$('.bw-days',bw),slotsEl=$('.bw-slots',bw),monthEl=$('.bw-month',bw);
    var steps=$$('.bw-step',bw),go=function(n){steps.forEach(function(s){s.hidden=s.dataset.step!==String(n)})};
    var slotsFor=function(d){var k=key(d);if(API)return AVAIL[k]||[];return TIMES.filter(function(t){return (hash(k+t)%10)>3})};
    var fmt=function(d){return DF[d.getDay()]+', '+d.getDate()+' '+MN[d.getMonth()]};
    function renderWeek(){
      var start=new Date(week0);start.setDate(start.getDate()+week*7);
      monthEl.textContent=MF[start.getMonth()]+' '+start.getFullYear();
      $$('.bw-nav',bw)[0].disabled=week===0;$$('.bw-nav',bw)[1].disabled=week>=3;
      daysEl.innerHTML='';var firstOk=null;
      for(var i=0;i<5;i++){(function(){
        var d=new Date(start);d.setDate(start.getDate()+i);
        var b=document.createElement('button');b.type='button';b.className='bw-day';b.setAttribute('role','radio');
        b.innerHTML='<small>'+DN[d.getDay()]+'</small><b>'+d.getDate()+'</b>';
        var ok=d>=first&&slotsFor(d).length>0;b.disabled=!ok;b.setAttribute('aria-label',fmt(d));
        b.addEventListener('click',function(){pickDay(d,b)});
        daysEl.appendChild(b);if(ok&&!firstOk)firstOk=[d,b];
      })()}
      if(firstOk)pickDay(firstOk[0],firstOk[1]);else{slotsEl.innerHTML='<p class="bw-empty">Brak wolnych terminów w tym tygodniu. Sprawdź kolejny.</p>'}
    }
    function pickDay(d,b){
      selDay=d;$$('.bw-day',daysEl).forEach(function(x){x.setAttribute('aria-checked',String(x===b))});
      slotsEl.innerHTML='';
      slotsFor(d).forEach(function(t,i){var s=document.createElement('button');s.type='button';s.className='bw-slot';s.setAttribute('role','radio');s.textContent=t;s.style.animationDelay=(i*35)+'ms';
        s.addEventListener('click',function(){
          selTime=t;
          $$('.bw-slot',slotsEl).forEach(function(x){x.setAttribute('aria-checked',String(x===s))});
          $('.bw-picked',bw).textContent=fmt(selDay)+', godz. '+t;
          setTimeout(function(){go(2);var n=$('input',steps[1]);if(n)n.focus({preventScroll:true})},180);
        });
        slotsEl.appendChild(s)});
    }
    $$('.bw-nav',bw).forEach(function(n){n.addEventListener('click',function(){week=Math.max(0,Math.min(3,week+(+n.dataset.dir)));renderWeek()})});
    $('.bw-back',bw).addEventListener('click',function(){go(1)});
    var form=$('form.bw-step',bw);
    var done=function(meet,em){
      $('.bw-when',bw).textContent=fmt(selDay)+', godz. '+selTime;
      $('.bw-link',bw).textContent=meet.replace(/^https?:\/\//,'');
      $('.bw-sent',bw).textContent=API?'Zaproszenie z linkiem wysłaliśmy na '+em+'. Spotkanie jest też w naszym kalendarzu.':'Potwierdzenie z linkiem przyjdzie na '+em+'.';
      go(3);try{window.va&&window.va('event',{name:'Rezerwacja spotkania'})}catch(x){}
    };
    form.addEventListener('submit',function(e){
      e.preventDefault();var nm=form.elements['bw-name'].value.trim(),em=form.elements['bw-email'].value.trim(),org=form.elements['bw-org'].value.trim(),er=$('.bw-err',form);
      if(!nm){er.textContent='Podaj imię i nazwisko.';form.elements['bw-name'].focus();return}
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)){er.textContent='Podaj poprawny adres e-mail, np. jan.kowalski@szpital.pl.';form.elements['bw-email'].focus();return}
      er.textContent='';
      var btn=$('.bw-submit',form),lbl=btn.textContent;btn.disabled=true;btn.textContent='Rezerwowanie…';
      var reset=function(){btn.disabled=false;btn.textContent=lbl};
      if(API){
        fetch('/api/booking',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:key(selDay),time:selTime,name:nm,email:em,org:org})})
          .then(function(r){return r.json().then(function(j){return {r:r,j:j}})})
          .then(function(x){reset();if(x.r.ok&&x.j.ok){var k=key(selDay);if(AVAIL[k])AVAIL[k]=AVAIL[k].filter(function(t){return t!==selTime});done(x.j.meet||'',em)}
            else{er.textContent=x.j.message||'Nie udało się zarezerwować. Spróbuj inny termin.';if(x.r.status===409){loadAvail(function(){go(1);renderWeek()})}}})
          .catch(function(){reset();er.textContent='Brak połączenia. Spróbuj ponownie albo zadzwoń: 42 636 55 94.'});
        return;
      }
      setTimeout(function(){
        var c='abcdefghijkmnopqrstuvwxyz',r=function(n){var o='';for(var i=0;i<n;i++)o+=c[Math.floor(Math.random()*c.length)];return o};
        reset();done('meet.google.com/'+r(3)+'-'+r(4)+'-'+r(3),em);
      },900);
    });
    $('.bw-again',bw).addEventListener('click',function(){form.reset();go(1);renderWeek()});
    function loadAvail(cb){
      if(window.__PREVIEW||!/^https?:$/.test(location.protocol)){cb&&cb();return}
      var ctl=('AbortController' in window)?new AbortController():null;var tm=setTimeout(function(){ctl&&ctl.abort()},6000);
      fetch('/api/availability?start='+key(first)+'&days=28',{signal:ctl?ctl.signal:undefined,headers:{'Accept':'application/json'}})
        .then(function(r){return r.ok?r.json():null}).then(function(j){clearTimeout(tm);if(j&&j.ok&&j.days){API=true;AVAIL=j.days;$$('.bw-demo',bw).forEach(function(e){e.remove()})}cb&&cb()})
        .catch(function(){clearTimeout(tm);cb&&cb()});
    }
    renderWeek();
    loadAvail(function(){if(API)renderWeek()});
    $$('[data-booking]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();scrollToEl(bw);setTimeout(function(){var f=$('.bw-day[aria-checked="true"]',bw)||$('.bw-day:not(:disabled)',bw);if(f)f.focus({preventScroll:true})},700)})});
  }

  /* preview mode: all pages live in one document, switched by a bare #token */
  if(window.__PREVIEW){
    var pages=$$('[data-page]');
    var go=function(name,anchor,noScroll){
      var pg=pages.filter(function(p){return p.dataset.page===name})[0]||pages[0];
      pages.forEach(function(p){p.hidden=p!==pg});pg.classList.remove('enter');void pg.offsetWidth;pg.classList.add('enter');
      $$('[data-nav]').forEach(function(a){var cur=a.dataset.nav===pg.dataset.nav;if(a.classList.contains('dd'))a.classList.toggle('current',cur);else if(cur)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
      document.title=pg.dataset.title;
      try{history.replaceState(null,'','#'+pg.dataset.page)}catch(e){}
      if(!noScroll)scrollToY(0,true);
      setupReveal(pg);setupCount(pg);setupBars(pg);setupSplit(pg);window.dispatchEvent(new Event('resize'));onScroll();
      if(noScroll)return;
      var t=anchor&&document.getElementById(anchor);
      if(t)setTimeout(function(){scrollToEl(t)},120);
    };
    document.addEventListener('click',function(e){
      var a=e.target.closest('a[href]');if(!a)return;
      var m=a.getAttribute('href').match(/^([a-z0-9-]+)\.html(?:#([\w-]+))?$/);
      if(m){e.preventDefault();go(m[1],m[2])}
    });
    var h=(location.hash||'').slice(1);
    go(pages.some(function(p){return p.dataset.page===h})?h:'index',null,true);
  } else {
    setupReveal(document);setupCount(document);setupBars(document);setupSplit(document);
    if(location.hash){var t0=document.getElementById(location.hash.slice(1));if(t0)setTimeout(function(){scrollToEl(t0,true)},60)}
  }
})();
