const $ = (sel, ctx=document) => ctx.querySelector(sel);

// ---- 彩帶 ----
const confettiCanvas = $("#confetti");
const cctx = confettiCanvas.getContext("2d");
let confettiRunning = false;
function resizeCanvas(){ confettiCanvas.width = innerWidth; confettiCanvas.height = innerHeight; }
addEventListener("resize", resizeCanvas); resizeCanvas();
function makeConfetti(n=180){
  const colors = ["#ff6584","#ffd166","#7bdff2","#c79aff","#95e1d3","#ff8fab"];
  return Array.from({length:n},()=>({
    x:Math.random()*confettiCanvas.width, y:-20-Math.random()*confettiCanvas.height,
    w:6+Math.random()*6, h:8+Math.random()*10, vy:2+Math.random()*3, vx:-1+Math.random()*2,
    rot:Math.random()*Math.PI, vr:-0.1+Math.random()*0.2, color:colors[(Math.random()*colors.length)|0], alpha:.9
  }));
}
function runConfetti(ms=5000){
  if(confettiRunning) return; confettiRunning = true;
  const ps = makeConfetti(180); const t0 = performance.now();
  function frame(t){
    cctx.clearRect(0,0,confettiCanvas.width, confettiCanvas.height);
    ps.forEach(p=>{
      p.vy += .01; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if(p.y > confettiCanvas.height + 30){ p.y = -20; p.x = Math.random()*confettiCanvas.width; p.vy = 2 + Math.random()*3; }
      cctx.save(); cctx.globalAlpha = p.alpha; cctx.translate(p.x,p.y); cctx.rotate(p.rot);
      cctx.fillStyle = p.color; cctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); cctx.restore();
    });
    if(t - t0 < ms) requestAnimationFrame(frame); else confettiRunning = false;
  }
  requestAnimationFrame(frame);
}
$("#celebrateBtn").addEventListener("click", ()=> runConfetti(6000));

// ---- 倒數 ----
function setupCountdown(){
  const sec = $("#countdown"), clock = $("#clock"), msg = $("#todayMsg");
  const target = new Date(sec?.dataset?.bday || "2025-12-15T00:00:00+08:00");
  const pad = n => n.toString().padStart(2,"0");
  function tick(){
    const diff = target.getTime() - Date.now();
    if(diff <= 0){ clock.textContent = "00 天 00 時 00 分 00 秒"; msg.classList.remove("hidden"); return; }
    const s = Math.floor(diff/1000), d = Math.floor(s/86400), h = Math.floor((s%86400)/3600),
          m = Math.floor((s%3600)/60), sec = s%60;
    clock.textContent = `${pad(d)} 天 ${pad(h)} 時 ${pad(m)} 分 ${pad(sec)} 秒`;
    requestAnimationFrame(()=>setTimeout(tick, 500));
  }
  tick();
}

// ---- 留言牆（本機） ----
const GB_KEY = "local-guestbook-v1";
const loadGB = () => { try{ return JSON.parse(localStorage.getItem(GB_KEY)||"[]"); }catch{return []} };
const saveGB = items => localStorage.setItem(GB_KEY, JSON.stringify(items||[]));
const escapeHtml = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderGB(){
  const ul = $("#gbList"); ul.innerHTML = "";
  loadGB().forEach(({name,msg,ts})=>{
    const li = document.createElement("li");
    li.innerHTML = `<strong>${escapeHtml(name||"匿名")}</strong>：${escapeHtml(msg||"")}
      <div class="muted" style="font-size:12px;margin-top:4px">${new Date(ts).toLocaleString()}</div>`;
    ul.appendChild(li);
  });
}
function setupGB(){
  $("#gbAdd").addEventListener("click", ()=>{
    const name = $("#gbName").value.trim(), msg = $("#gbMsg").value.trim();
    if(!msg) return; const items = loadGB(); items.unshift({name,msg,ts:Date.now()}); saveGB(items); renderGB(); $("#gbMsg").value = "";
  });
  $("#gbClear").addEventListener("click", ()=>{ if(confirm("只會清除此裝置上的留言，確定？")){ saveGB([]); renderGB(); } });
  renderGB();
}

function setupNotes(){
  const pairs = [
    { openBtn: "openNote1", dialog: "note1", textarea: "note1Text", saved: "note1Saved", key: "note1" },
    { openBtn: "openNote2", dialog: "note2", textarea: "note2Text", saved: "note2Saved", key: "note2" },
  ];
  const esc = s => s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));

  pairs.forEach(p=>{
    const open = document.getElementById(p.openBtn);
    const dlg  = document.getElementById(p.dialog);
    const ta   = document.getElementById(p.textarea);
    const saved= document.getElementById(p.saved);
    const saveBtn = dlg.querySelector(".save-btn");

    // 打開時帶入本機已存內容
    open.addEventListener("click", ()=>{
      ta.value = localStorage.getItem(p.key) || "";
      saved.style.display = "none";
      dlg.showModal();
    });

    // 儲存到本機
    saveBtn.addEventListener("click", ()=>{
      localStorage.setItem(p.key, ta.value || "");
      saved.style.display = "block";
      setTimeout(()=> saved.style.display = "none", 1200);
    });
  });
}

function setupCarousel(rootSelector, opts={}){
  const el = (typeof rootSelector === "string") ? document.querySelector(rootSelector) : rootSelector;
  if(!el) return;
  const track = el.querySelector(".carousel-track");
  const prev  = el.querySelector(".prev");
  const next  = el.querySelector(".next");
  const slides = Array.from(track.children);
  const dotsWrap = el.querySelector(".carousel-dots");
  let i = 0, timer = null;

  // 建立 dots
  if(dotsWrap && dotsWrap.children.length === 0){
    slides.forEach((_, k)=>{
      const b = document.createElement("button");
      b.type = "button"; b.className = "dot" + (k===0? " is-active": "");
      b.setAttribute("aria-label", `第 ${k+1} 張`);
      b.addEventListener("click", ()=> go(k));
      dotsWrap.appendChild(b);
    });
  }
  const dots = dotsWrap ? Array.from(dotsWrap.children) : [];

  function go(idx){
    i = (idx + slides.length) % slides.length;
    track.style.transform = `translateX(-${i*100}%)`;
    dots.forEach((d, k)=> d.classList.toggle("is-active", k===i));
  }
  prev?.addEventListener("click", ()=> go(i-1));
  next?.addEventListener("click", ()=> go(i+1));

  // 鍵盤
  el.tabIndex = 0;
  el.addEventListener("keydown", e=>{
    if(e.key === "ArrowLeft") go(i-1);
    if(e.key === "ArrowRight") go(i+1);
  });

  // 觸控/滑鼠拖曳
  let startX=0, dx=0, dragging=false;
  const start = e => { dragging=true; startX=(e.touches? e.touches[0].clientX : e.clientX); track.style.transition="none"; };
  const move  = e => { if(!dragging) return; const x=(e.touches? e.touches[0].clientX : e.clientX); dx=x-startX; track.style.transform=`translateX(calc(-${i*100}% + ${dx}px))`; };
  const end   = () => { if(!dragging) return; track.style.transition="transform .4s ease"; if(Math.abs(dx)>50){ go(i + (dx>0? -1: +1)); } else { go(i); } dragging=false; dx=0; };
  el.addEventListener("touchstart", start, {passive:true});
  el.addEventListener("touchmove",  move,  {passive:true});
  el.addEventListener("touchend",   end);
  el.addEventListener("mousedown",  start);
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", end);

  // 自動播放
  const { autoplay=true, interval=3500, pauseOnHover=true } = opts;
  function play(){ if(!autoplay) return; stop(); timer = setInterval(()=> go(i+1), interval); }
  function stop(){ if(timer){ clearInterval(timer); timer=null; } }
  if(pauseOnHover){ el.addEventListener("mouseenter", stop); el.addEventListener("mouseleave", play); document.addEventListener("visibilitychange", ()=> document.hidden? stop(): play()); }
  go(0); play();
  return { go, play, stop };
}


// ---- 信件對話框 & 初始化 ----
function setupLetter(){ $("#openLetterBtn").addEventListener("click", ()=> $("#letter").showModal()); }
addEventListener("DOMContentLoaded", ()=>{
  setupCountdown(); setupLetter(); setupGB(); setTimeout(()=> runConfetti(3000), 800);
});
