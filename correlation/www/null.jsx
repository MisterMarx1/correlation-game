import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";

const COLS = 8, ROWS = 10, MAX_E = 5, K = 1;
const DECAY_BASE = 14000, DECAY_MIN = 4500, SPAWN_BASE = 2400, SPAWN_MIN = 800;
const ECHO_DUR = 2500, ECHO_BOOST = 0.25, CIRC = 100.53;

const EC = ["transparent","#1e40af","#0e7490","#047857","#b45309","#b91c1c"];
const EG = ["transparent","rgba(30,64,175,0.5)","rgba(14,116,144,0.5)","rgba(4,120,87,0.5)","rgba(180,83,9,0.6)","rgba(185,28,28,0.7)"];
const EB = ["transparent","#93c5fd","#67e8f9","#6ee7b7","#fcd34d","#fca5a5"];

const RGBA_MAP={"#93c5fd":[147,197,253],"#67e8f9":[103,232,249],"#6ee7b7":[110,231,183],
  "#fcd34d":[252,211,77],"#fca5a5":[252,165,165],"#f87171":[248,113,113],
  "rgb(147,197,253)":[147,197,253],"rgb(103,232,249)":[103,232,249],
  "rgb(110,231,183)":[110,231,183],"rgb(252,211,77)":[252,211,77],
  "rgb(252,165,165)":[252,165,165],"rgb(248,113,113)":[248,113,113]};
function toRGB(c){return RGBA_MAP[c]||[255,255,255]}

function recoilP(M,dE){return Math.sqrt(2*M*dE+dE*dE)/K}
function corrProb(r){
  if(r<0.5)return 0.9;
  // 1/(4πr²) scaled: r=1 ≈ 85%, r=1.41 ≈ 55%, r=2 ≈ 35%, r=3 ≈ 16%, r=5 ≈ 6%
  return Math.min(0.95, 11/(4*Math.PI*r*r));
}
function empty(){return{e:0,mass:0,born:0,decay:0}}
function mkGrid(){return Array.from({length:ROWS},()=>Array.from({length:COLS},empty))}
function mkCell(lvl,now){
  const maxE=Math.min(2+Math.floor(lvl/2),MAX_E);
  return{e:1+Math.floor(Math.random()*maxE),mass:1+Math.floor(Math.random()*3),born:now,decay:now+Math.max(DECAY_MIN,DECAY_BASE-lvl*500)}
}

// Bolt: flat array [x1,y1,x2,y2,width,opacity, ...]
function genBolt(x1,y1,x2,y2,d=0){
  const segs=[];const dx=x2-x1,dy=y2-y1,dist=Math.sqrt(dx*dx+dy*dy);
  if(dist<8||d>3){segs.push(x1,y1,x2,y2,Math.max(0.5,3-d*0.8),Math.max(0.3,1-d*0.25));return segs}
  const jit=(Math.random()-0.5)*dist*0.35,nx=-dy/dist,ny=dx/dist;
  const jx=x1+dx*0.5+nx*jit,jy=y1+dy*0.5+ny*jit;
  segs.push(...genBolt(x1,y1,jx,jy,d),...genBolt(jx,jy,x2,y2,d));
  if(d<2&&Math.random()<0.4){
    const a=Math.atan2(dy,dx)+(Math.random()-0.5)*1.2,l=dist*(0.2+Math.random()*0.3);
    segs.push(...genBolt(jx,jy,jx+Math.cos(a)*l,jy+Math.sin(a)*l,d+1));
  }
  return segs;
}
function mkParticles(cx,cy,n,col){
  const rgb=toRGB(col),out=[],now=Date.now();
  for(let i=0;i<n;i++){const a=Math.random()*6.283,sp=20+Math.random()*40;
    out.push({x:cx,y:cy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:300+Math.random()*500,born:now,r:rgb[0],g:rgb[1],b:rgb[2],size:1.5+Math.random()*2.5})}
  return out;
}

// Memoized cell
const Cell=memo(function Cell({e,mass,isSel,isDet,detProb,echoB,dp,isNew,onClick}){
  return(
    <div onClick={onClick} className={`${isNew&&e>0?"n3-spawn":""} ${echoB>0.05&&e>0?"n3-echo":""}`}
      style={{borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",
        userSelect:"none",WebkitUserSelect:"none",position:"relative",overflow:"hidden",
        backgroundColor:e>0?EC[e]:"rgba(15,23,42,0.3)",
        border:isSel?"2px solid #fff":isDet?`2px solid ${EB[e]}77`:"1px solid rgba(255,255,255,0.03)",
        boxShadow:isSel?`0 0 20px ${EG[e]},inset 0 0 12px rgba(255,255,255,0.15)`:e>0?`0 0 6px ${EG[e]}`:"none",
        transform:isSel?"scale(1.08)":"scale(1)",cursor:e>0?"pointer":"default",
        transition:"background-color 0.25s,border 0.15s,box-shadow 0.25s,transform 0.1s ease-out"}}>
      {e>0&&<svg viewBox="0 0 40 40" style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}>
        <circle cx="20" cy="20" r="16" fill="none"
          stroke={dp>0.8?"#dc2626":dp>0.6?"#ef4444":dp>0.4?"#d97706":dp>0.2?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.12)"}
          strokeWidth="1.8" strokeDasharray={`${(1-dp)*CIRC} ${CIRC}`} strokeDashoffset="25.13" strokeLinecap="round"
          style={{transition:"stroke 0.3s"}}/></svg>}
      {e>0&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",zIndex:2,position:"relative"}}>
        <span style={{fontSize:13,fontWeight:800,color:"#fff",textShadow:"0 1px 3px rgba(0,0,0,0.5)"}}>{e}</span>
        <span style={{fontSize:7,color:"rgba(255,255,255,0.3)",fontWeight:600}}>M{mass}</span></div>}
      {isDet&&<div style={{position:"absolute",top:-3,right:-3,fontSize:7,fontWeight:700,color:"#fff",
        padding:"1px 3px",borderRadius:3,zIndex:5,
        backgroundColor:detProb>0.6?"#047857":detProb>0.3?"#b45309":"#b91c1c"}}>{Math.round(detProb*100)}%</div>}
    </div>);
});

export default function NullV3(){
  const[grid,setGrid]=useState(mkGrid);
  const[score,setScore]=useState(0);
  const[level,setLevel]=useState(1);
  const[sel,setSel]=useState(null);
  const[phase,setPhase]=useState("play");
  const[echoes,setEchoes]=useState([]);
  const[cascTxt,setCascTxt]=useState(null);
  const[fillPct,setFillPct]=useState(0);
  const[paused,setPaused]=useState(false);
  const[totalT,setTotalT]=useState(0);
  const[combo,setCombo]=useState(0);
  const[comboT,setComboT]=useState(0);
  const[info,setInfo]=useState(null);
  const[shake,setShake]=useState(false);
  const[screenFlash,setScreenFlash]=useState(null);
  const[tick,setTick]=useState(0);

  const gridRef=useRef(null);const canvasRef=useRef(null);
  const particlesRef=useRef([]);const boltsRef=useRef([]);
  const animRef=useRef(null);const dimsRef=useRef({cw:0,ch:0});

  const updateDims=useCallback(()=>{
    const g=gridRef.current;if(!g)return;
    const r=g.getBoundingClientRect();dimsRef.current={cw:r.width/COLS,ch:r.height/ROWS};
  },[]);
  const cellPos=useCallback((x,y)=>{const{cw,ch}=dimsRef.current;return{px:x*cw+cw/2,py:y*ch+ch/2}},[]);

  // Unified canvas render
  useEffect(()=>{
    const cv=canvasRef.current;if(!cv)return;const ctx=cv.getContext("2d");let on=true;
    const draw=()=>{if(!on)return;const now=Date.now(),W=cv.width,H=cv.height;ctx.clearRect(0,0,W,H);
      ctx.lineCap="round";
      // Bolts
      const ab=[];
      for(const b of boltsRef.current){const age=now-b.born;if(age>b.dur)continue;ab.push(b);
        const t=age/b.dur,a=b.op*(1-t)*(1-t),s=b.segs,[r,g,bl]=b.rgb;
        for(let i=0;i<s.length;i+=6){ctx.beginPath();ctx.moveTo(s[i],s[i+1]);ctx.lineTo(s[i+2],s[i+3]);
          ctx.strokeStyle=`rgba(${r},${g},${bl},${a*s[i+5]*0.2})`;ctx.lineWidth=s[i+4]*5;ctx.stroke()}
        for(let i=0;i<s.length;i+=6){ctx.beginPath();ctx.moveTo(s[i],s[i+1]);ctx.lineTo(s[i+2],s[i+3]);
          ctx.strokeStyle=`rgba(${r},${g},${bl},${a*s[i+5]})`;ctx.lineWidth=s[i+4];ctx.stroke()}
        for(let i=0;i<s.length;i+=6){if(s[i+4]<2)continue;ctx.beginPath();ctx.moveTo(s[i],s[i+1]);ctx.lineTo(s[i+2],s[i+3]);
          ctx.strokeStyle=`rgba(255,255,255,${a*s[i+5]*0.8})`;ctx.lineWidth=s[i+4]*0.4;ctx.stroke()}
      }
      boltsRef.current=ab;
      // Particles
      const ap=[];
      for(const p of particlesRef.current){const age=now-p.born;if(age>p.life)continue;ap.push(p);
        const t=age/p.life,px=p.x+p.vx*t,py=p.y+p.vy*t,al=1-t*t,sz=p.size*(1-t*0.5);
        ctx.beginPath();ctx.arc(px,py,sz,0,6.283);ctx.fillStyle=`rgba(${p.r},${p.g},${p.b},${al})`;ctx.fill();
        if(sz>1.5){ctx.beginPath();ctx.arc(px,py,sz*2.5,0,6.283);ctx.fillStyle=`rgba(${p.r},${p.g},${p.b},${al*0.12})`;ctx.fill()}}
      particlesRef.current=ap;
      animRef.current=requestAnimationFrame(draw)};
    animRef.current=requestAnimationFrame(draw);
    return()=>{on=false;cancelAnimationFrame(animRef.current)};
  },[]);

  useEffect(()=>{
    const resize=()=>{const c=canvasRef.current,g=gridRef.current;if(!c||!g)return;
      const r=g.getBoundingClientRect();c.width=r.width;c.height=r.height;c.style.width=r.width+"px";c.style.height=r.height+"px";updateDims()};
    resize();window.addEventListener("resize",resize);return()=>window.removeEventListener("resize",resize);
  },[phase,updateDims]);

  const fireBolt=useCallback((x1,y1,x2,y2,col,dur=700,op=1)=>{
    boltsRef.current.push({segs:genBolt(x1,y1,x2,y2),rgb:toRGB(col),op,born:Date.now(),dur})
  },[]);
  const firePart=useCallback((x,y,n,col)=>{particlesRef.current.push(...mkParticles(x,y,n,col))},[]);

  // Spawn
  const spawnTick=useCallback(()=>{
    if(phase!=="play"||paused)return;const now=Date.now();
    setGrid(prev=>{const ng=prev.map(r=>r.map(c=>({...c})));
      let f=0;for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(ng[y][x].e>0)f++;
      if(f>=ROWS*COLS-2){setPhase("over");return prev}
      const cnt=Math.min(1+Math.floor(level/3),3);let s=0;
      for(let a=0;a<40&&s<cnt;a++){const x=Math.floor(Math.random()*COLS),y=Math.floor(Math.random()*ROWS);
        if(ng[y][x].e===0){ng[y][x]=mkCell(level,now);s++}}
      return ng});
  },[phase,paused,level]);

  // Decay
  const decayTick=useCallback(()=>{
    if(phase!=="play"||paused)return;const now=Date.now();const ols=[];
    setGrid(prev=>{const ng=prev.map(r=>r.map(c=>({...c})));let over=false;
      for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const c=ng[y][x];
        if(c.e>0&&c.decay>0&&now>c.decay){over=true;ols.push({x,y,e:c.e});
          ng[y][x].decay=now+Math.max(DECAY_MIN,DECAY_BASE-level*500);ng[y][x].born=now;
          for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1]]){const nx=x+dx,ny=y+dy;
            if(nx>=0&&nx<COLS&&ny>=0&&ny<ROWS){
              if(ng[ny][nx].e===0){const nc=mkCell(level,now);nc.e=Math.min(c.e,2);ng[ny][nx]=nc}
              else if(ng[ny][nx].e<MAX_E){ng[ny][nx].e=Math.min(MAX_E,ng[ny][nx].e+1);ng[ny][nx].decay=Math.min(ng[ny][nx].decay,now+3500)}}}}}
      if(over){setShake(true);setTimeout(()=>setShake(false),250);
        let f=0;for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(ng[y][x].e>0)f++;
        if(f>=ROWS*COLS-1)setPhase("over")}
      return ng});
    if(ols.length>0){for(const oc of ols){const cp=cellPos(oc.x,oc.y);
      for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1]]){const nx=oc.x+dx,ny=oc.y+dy;
        if(nx>=0&&nx<COLS&&ny>=0&&ny<ROWS){const np=cellPos(nx,ny);fireBolt(cp.px,cp.py,np.px,np.py,"#fca5a5",500,0.7)}}
      firePart(cp.px,cp.py,12,"rgb(252,165,165)")}
      setScreenFlash("rgba(220,38,38,0.3)");setTimeout(()=>setScreenFlash(null),100)}
  },[phase,paused,level,cellPos,fireBolt,firePart]);

  useEffect(()=>{if(phase!=="play"||paused)return;const iv=setInterval(spawnTick,Math.max(SPAWN_MIN,SPAWN_BASE-level*140));return()=>clearInterval(iv)},[spawnTick,phase,level,paused]);
  useEffect(()=>{if(phase!=="play"||paused)return;const iv=setInterval(decayTick,500);return()=>clearInterval(iv)},[decayTick,phase,paused]);
  useEffect(()=>{if(phase!=="play"||paused)return;const iv=setInterval(()=>setTick(t=>t+1),400);return()=>clearInterval(iv)},[phase,paused]);

  useEffect(()=>{let f=0;for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(grid[y][x].e>0)f++;setFillPct(f/(ROWS*COLS))},[grid]);
  useEffect(()=>{const nl=1+Math.floor(totalT/6);if(nl!==level)setLevel(nl)},[totalT,level]);
  useEffect(()=>{if(comboT>0){const t=setTimeout(()=>setComboT(c=>c-1),600);return()=>clearTimeout(t)}else setCombo(0)},[comboT]);
  useEffect(()=>{if(!echoes.length)return;const iv=setInterval(()=>{const now=Date.now();setEchoes(p=>p.filter(e=>now-e.time<ECHO_DUR))},500);return()=>clearInterval(iv)},[echoes]);

  // Precomputed echo map
  const echoMap=useMemo(()=>{const now=Date.now();const m=new Float32Array(ROWS*COLS);
    for(const echo of echoes){if(now-echo.time>=ECHO_DUR)continue;const fade=1-(now-echo.time)/ECHO_DUR;
      for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const r=Math.sqrt((x-echo.x)**2+(y-echo.y)**2);if(r<4)m[y*COLS+x]+=ECHO_BOOST*(1-r/4)*fade}}
    return m},[echoes,tick]);
  const getEcho=useCallback((x,y)=>Math.min(echoMap[y*COLS+x],0.5),[echoMap]);

  const getDets=useCallback((sx,sy)=>{const src=grid[sy][sx];if(src.e<=0)return[];const dE=src.e,ds=[];
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){if(x===sx&&y===sy)continue;const d=grid[y][x];if(d.e<=0||d.e<dE)continue;
      const r=Math.sqrt((x-sx)**2+(y-sy)**2);let p=corrProb(r);if(d.e===dE)p*=0.5;p=Math.min(0.98,p+echoMap[y*COLS+x]);ds.push({x,y,prob:p,r,dE})}
    return ds.sort((a,b)=>b.prob-a.prob)},[grid,echoMap]);
  const detMap=useMemo(()=>{if(!sel)return{};const ds=getDets(sel.x,sel.y);const m={};for(const d of ds)m[`${d.x},${d.y}`]=d;return m},[sel,getDets]);

  const execTrans=useCallback((sx,sy,dx,dy)=>{
    const now=Date.now(),src=grid[sy][sx],det=grid[dy][dx],dE=src.e,r=Math.sqrt((dx-sx)**2+(dy-sy)**2),mom=recoilP(det.mass,dE);
    const bc=EB[Math.min(dE,MAX_E)],pc=dE<=1?"rgb(147,197,253)":dE<=2?"rgb(103,232,249)":dE<=3?"rgb(110,231,183)":dE<=4?"rgb(252,211,77)":"rgb(252,165,165)";
    const sp=cellPos(sx,sy),dp=cellPos(dx,dy);
    fireBolt(sp.px,sp.py,dp.px,dp.py,bc,700,1);fireBolt(sp.px+1,sp.py+1,dp.px-1,dp.py-1,bc,500,0.5);
    firePart(sp.px,sp.py,8+dE*3,pc);firePart(dp.px,dp.py,12+dE*4,pc);
    setScreenFlash(bc);setTimeout(()=>setScreenFlash(null),120);
    setGrid(prev=>{const ng=prev.map(row=>row.map(c=>({...c})));ng[sy][sx]=empty();
      const nE=det.e-dE;if(nE<=0)ng[dy][dx]=empty();else{ng[dy][dx].e=nE;ng[dy][dx].born=now;ng[dy][dx].decay=now+Math.max(DECAY_MIN,DECAY_BASE-level*500)}
      if(mom>2){for(const[ddx,ddy]of[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]){
        const nx=dx+ddx,ny=dy+ddy;if(nx>=0&&nx<COLS&&ny>=0&&ny<ROWS&&ng[ny][nx].e>0&&ng[ny][nx].e<=Math.floor(mom)){
          ng[ny][nx]=empty();const rp=cellPos(nx,ny);firePart(rp.px,rp.py,6,"rgb(252,165,165)")}}}
      return ng});
    const nc=combo+1;setScore(s=>s+Math.round(dE*(1+r*0.5)*nc*15));setCombo(nc);setComboT(5);setTotalT(t=>t+1);
    setEchoes(p=>[...p,{x:dx,y:dy,time:now},{x:sx,y:sy,time:now}]);
    if(nc>=3){setCascTxt({text:`CORRELATION CASCADE ×${nc}`,time:now});setTimeout(()=>setCascTxt(null),1500)}
    else if(r>5){setCascTxt({text:"LONG-RANGE CORRELATION",time:now});setTimeout(()=>setCascTxt(null),1200)}
    else if(mom>3){setCascTxt({text:"MASSIVE RECOIL",time:now});setTimeout(()=>setCascTxt(null),1200)}
    setInfo({type:"ok",dE,r,mom,prob:corrProb(r),combo:nc,time:now});setSel(null);
  },[grid,combo,cellPos,fireBolt,firePart,level]);

  const handleClick=useCallback((x,y)=>{
    if(phase!=="play"||paused)return;const cell=grid[y][x];
    if(sel&&sel.x===x&&sel.y===y){setSel(null);return}
    if(!sel){if(cell.e>0){setSel({x,y});
      // Reset source timer on selection
      const now=Date.now();setGrid(prev=>{const ng=prev.map(row=>row.map(c=>({...c})));
        if(ng[y][x].e>0){ng[y][x].born=now;ng[y][x].decay=now+Math.max(DECAY_MIN,DECAY_BASE-level*500)}return ng})}return}
    const src=grid[sel.y][sel.x],det=grid[y][x],r=Math.sqrt((x-sel.x)**2+(y-sel.y)**2);
    if(det.e<=0||det.e<src.e){setInfo({type:"mis",sE:src.e,dE:det.e,time:Date.now()});setSel(null);return}
    let prob=corrProb(r);if(det.e===src.e)prob*=0.5;prob=Math.min(0.98,prob+getEcho(x,y));
    if(Math.random()<prob){execTrans(sel.x,sel.y,x,y)}
    else{const penalty=Math.round(src.e*10*level),now=Date.now(),freshDecay=now+Math.max(DECAY_MIN,DECAY_BASE-level*500);
      setScore(s=>Math.max(0,s-penalty));
      setGrid(prev=>{const ng=prev.map(row=>row.map(c=>({...c})));
        if(ng[sel.y][sel.x].e>0){ng[sel.y][sel.x].born=now;ng[sel.y][sel.x].decay=freshDecay;if(ng[sel.y][sel.x].e<MAX_E)ng[sel.y][sel.x].e+=1}
        if(ng[y][x].e>0){ng[y][x].born=now;ng[y][x].decay=freshDecay;if(ng[y][x].e<MAX_E)ng[y][x].e+=1}
        const sc=1+Math.floor(Math.random()*2);for(let i=0,a=0;i<sc&&a<20;a++){const sx2=Math.floor(Math.random()*COLS),sy2=Math.floor(Math.random()*ROWS);
          if(ng[sy2][sx2].e===0){ng[sy2][sx2]=mkCell(level,now);i++}}
        return ng});
      const sp2=cellPos(sel.x,sel.y),dp2=cellPos(x,y);
      const mx=(sp2.px+dp2.px)/2+(Math.random()-0.5)*30,my=(sp2.py+dp2.py)/2+(Math.random()-0.5)*30;
      fireBolt(sp2.px,sp2.py,mx,my,"#f87171",400,0.8);firePart(mx,my,10,"rgb(248,113,113)");
      setScreenFlash("rgba(248,113,113,0.5)");setTimeout(()=>setScreenFlash(null),80);
      setShake(true);setTimeout(()=>setShake(false),150);
      setInfo({type:"decorr",prob,r,penalty,time:now});setSel(null)}
  },[phase,paused,grid,sel,getEcho,execTrans,cellPos,level,fireBolt,firePart]);

  useEffect(()=>{const h=e=>{if(e.key==="p"||e.key==="P")setPaused(p=>!p);if(e.key==="Escape")setSel(null)};
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h)},[]);

  const restart=useCallback(()=>{setGrid(mkGrid());setScore(0);setLevel(1);setTotalT(0);setCombo(0);setComboT(0);
    setSel(null);setEchoes([]);setPhase("play");setInfo(null);setCascTxt(null);setPaused(false);setFillPct(0);setScreenFlash(null);setTick(0);
    particlesRef.current=[];boltsRef.current=[]},[]);
  useEffect(()=>{restart()},[]);

  useEffect(()=>{const id="null-v3-css";if(document.getElementById(id))return;const s=document.createElement("style");s.id=id;
    s.textContent=`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Orbitron:wght@700;900&display=swap');
      @keyframes spawn{0%{opacity:0;transform:scale(0)}50%{opacity:1;transform:scale(1.25);filter:brightness(2.5)}100%{transform:scale(1);filter:brightness(1)}}
      @keyframes shake{0%,100%{transform:translate(0)}25%{transform:translate(-4px,3px)}50%{transform:translate(4px,-3px)}75%{transform:translate(-2px,-2px)}}
      @keyframes echo{0%{box-shadow:0 0 0 0 rgba(103,232,249,0.5)}100%{box-shadow:0 0 0 10px rgba(103,232,249,0)}}
      @keyframes cascTxt{0%{opacity:0;transform:translate(-50%,-50%) scale(0.4)}15%{opacity:1;transform:translate(-50%,-50%) scale(1.15)}75%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(0.9) translateY(-15px)}}
      @keyframes flash{0%{opacity:0.25}100%{opacity:0}}
      .n3-spawn{animation:spawn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards}
      .n3-shake{animation:shake 0.25s ease-in-out}.n3-echo{animation:echo 0.9s ease-out}`;
    document.head.appendChild(s);return()=>{const el=document.getElementById(id);if(el)el.remove()}},[]);

  const dreadBg=useMemo(()=>{if(fillPct<0.4)return"#030712";const r=Math.round(3+fillPct*60);
    return`rgb(${r},${Math.max(3,7-fillPct*5)},${Math.max(5,18-fillPct*15)})`},[fillPct]);
  const font="'IBM Plex Mono',monospace",tFont="'Orbitron',sans-serif";
  const nowMs=Date.now();

  if(phase==="over"){return(
    <div style={{...S.ctn,backgroundColor:"#030712",fontFamily:font}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:24,paddingTop:80}}>
        <h1 style={{margin:0,fontSize:32,fontWeight:900,letterSpacing:"0.3em",color:"#f8fafc",textShadow:"0 0 40px rgba(185,28,28,0.5)",fontFamily:tFont}}>GRID SATURATED</h1>
        <div style={{display:"flex",gap:24,flexWrap:"wrap",justifyContent:"center"}}>
          {[["SCORE",score.toLocaleString()],["LEVEL",level],["TRANSITIONS",totalT]].map(([l,v])=>(
            <div key={l} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <span style={{fontSize:9,letterSpacing:"0.15em",color:"#475569",fontWeight:600}}>{l}</span>
              <span style={{fontSize:22,fontWeight:700,color:"#f1f5f9"}}>{v}</span></div>))}
        </div>
        <button style={S.btn} onClick={restart}>PLAY AGAIN</button></div></div>)}

  return(
    <div style={{...S.ctn,backgroundColor:dreadBg,fontFamily:font,transition:"background-color 1.5s"}}>
      {fillPct>0.55&&<div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,
        background:`radial-gradient(ellipse at 50% 100%,rgba(185,28,28,${(fillPct-0.55)*0.4}) 0%,transparent 70%)`,transition:"all 1.5s"}}/>}
      {screenFlash&&<div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:50,backgroundColor:screenFlash,animation:"flash 0.12s ease-out forwards"}}/>}

      <div style={{width:"100%",maxWidth:480,marginBottom:8,zIndex:1,position:"relative"}}>
        <div style={{display:"flex",alignItems:"baseline",gap:10}}>
          <h1 style={{margin:0,fontSize:22,fontWeight:900,letterSpacing:"0.2em",color:"#f8fafc",textShadow:"0 0 20px rgba(14,116,144,0.3)",fontFamily:tFont}}>NULL by Mister Marx</h1>
          <span style={{fontSize:10,color:"#0e7490",fontStyle:"italic"}}>ΔE = hν</span></div>
        <div style={{display:"flex",gap:14,marginTop:4,flexWrap:"wrap"}}>
          {[["SCORE",score.toLocaleString()],["LVL",level],["CHAIN",combo>0?`×${combo}`:"—"],["TRANS",totalT]].map(([l,v])=>(
            <div key={l} style={{display:"flex",flexDirection:"column",gap:1}}>
              <span style={{fontSize:8,letterSpacing:"0.15em",color:"#475569",fontWeight:600}}>{l}</span>
              <span style={{fontSize:15,fontWeight:700,color:l==="CHAIN"&&combo>0?"#fbbf24":"#f1f5f9"}}>{v}</span></div>))}</div></div>

      <div className={shake?"n3-shake":""} style={{width:"100%",maxWidth:480,aspectRatio:`${COLS}/${ROWS}`,position:"relative",zIndex:1}} ref={gridRef}>
        <canvas ref={canvasRef} style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:15}}/>
        {cascTxt&&<div style={{position:"absolute",top:"45%",left:"50%",zIndex:20,pointerEvents:"none",
          fontSize:15,fontWeight:900,color:"#fbbf24",letterSpacing:"0.08em",whiteSpace:"nowrap",
          textShadow:"0 0 25px rgba(251,191,36,0.6),0 0 50px rgba(251,191,36,0.3)",
          fontFamily:tFont,animation:"cascTxt 1.5s ease-out forwards"}}>{cascTxt.text}</div>}

        <div style={{width:"100%",height:"100%",display:"grid",gap:2,padding:2,
          gridTemplateColumns:`repeat(${COLS},1fr)`,gridTemplateRows:`repeat(${ROWS},1fr)`,
          backgroundColor:"rgba(15,23,42,0.25)",borderRadius:6,
          border:fillPct>0.7?`1px solid rgba(185,28,28,${(fillPct-0.7)*2.5})`:"1px solid rgba(255,255,255,0.04)",transition:"border-color 1s"}}>
          {grid.map((row,y)=>row.map((cell,x)=>{
            const isSel=sel&&sel.x===x&&sel.y===y;const det=detMap[`${x},${y}`];
            const dp=cell.e>0?Math.min(1,Math.max(0,(nowMs-cell.born)/(cell.decay-cell.born))):0;
            const isNew=cell.e>0&&(nowMs-cell.born)<350;
            return <Cell key={`${x}-${y}`} e={cell.e} mass={cell.mass} isSel={!!isSel}
              isDet={!!det} detProb={det?det.prob:0} echoB={echoMap[y*COLS+x]} dp={dp} isNew={isNew}
              onClick={()=>handleClick(x,y)}/>;
          }))}</div></div>

      <div style={{width:"100%",maxWidth:480,marginTop:8,zIndex:1,position:"relative"}}>
        {info&&<div style={{padding:"5px 10px",borderRadius:4,borderLeft:"3px solid",
          borderLeftColor:info.type==="ok"?"#047857":info.type==="decorr"?"#b45309":"#b91c1c",backgroundColor:"rgba(15,23,42,0.45)",fontSize:11}}>
          {info.type==="ok"&&<><span style={{color:"#6ee7b7",fontWeight:700}}>CORRELATED </span><span style={{color:"#64748b"}}>ΔE={info.dE} · r={info.r.toFixed(1)} · p={info.mom.toFixed(1)} · P={Math.round(info.prob*100)}%{info.combo>1&&` · ×${info.combo}`}</span></>}
          {info.type==="decorr"&&<><span style={{color:"#fbbf24",fontWeight:700}}>DECORRELATED </span><span style={{color:"#64748b"}}>P={Math.round(info.prob*100)}% at r={info.r.toFixed(1)}</span><span style={{color:"#f87171"}}> · −{info.penalty}pts · nodes destabilized</span></>}
          {info.type==="mis"&&<><span style={{color:"#fca5a5",fontWeight:700}}>ENERGY MISMATCH </span><span style={{color:"#64748b"}}>detector energy must exceed source</span></>}
        </div>}
        <div style={{display:"flex",gap:6,marginTop:6}}>
          <button style={S.ctrl} onClick={()=>setPaused(p=>!p)}>{paused?"▶ RESUME":"⏸ PAUSE"}</button>
          <button style={S.ctrl} onClick={restart}>↺ QUIT</button></div>
        <div style={{marginTop:6,height:3,borderRadius:2,overflow:"hidden",backgroundColor:"rgba(255,255,255,0.04)"}}>
          <div style={{height:"100%",borderRadius:2,width:`${fillPct*100}%`,
            backgroundColor:fillPct>0.7?"#b91c1c":fillPct>0.5?"#b45309":"#0e7490",transition:"width 0.5s,background-color 1.5s"}}/></div></div>

      {paused&&<div style={{position:"fixed",inset:0,backgroundColor:"rgba(3,7,18,0.92)",
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,zIndex:100}}>
        <span style={{fontSize:32,fontWeight:900,letterSpacing:"0.3em",color:"#f8fafc",fontFamily:tFont}}>PAUSED</span>
        <button style={S.btn} onClick={()=>setPaused(false)}>RESUME</button></div>}
    </div>);
}

const S={
  ctn:{width:"100%",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",
    padding:12,boxSizing:"border-box",color:"#e2e8f0",position:"relative",overflow:"hidden"},
  btn:{padding:"12px 32px",backgroundColor:"#0e7490",color:"#fff",border:"none",borderRadius:6,
    fontSize:13,fontWeight:700,letterSpacing:"0.12em",cursor:"pointer",fontFamily:"inherit",
    boxShadow:"0 0 25px rgba(14,116,144,0.3)"},
  ctrl:{flex:1,padding:"7px 10px",backgroundColor:"rgba(30,41,59,0.7)",color:"#94a3b8",
    border:"1px solid rgba(255,255,255,0.06)",borderRadius:4,fontSize:10,fontWeight:600,
    letterSpacing:"0.08em",cursor:"pointer",fontFamily:"inherit"},
};