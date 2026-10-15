// Visual feedback is separate from the fog mask: it fades without restoring fog.
export class WipeEffects {
 constructor(){this.trail=[];this.particles=[];this.rings=[];this.last=null;this.enabled=true;this.reduced=matchMedia('(prefers-reduced-motion: reduce)');}
 clear(){this.trail=[];this.particles=[];this.rings=[];this.last=null;}
 emit(from,to,r,now=performance.now()){
  if(!this.enabled)return;
  const fresh=!from||!this.last||now-this.last.time>200;
  if(fresh){this.trail=[];if(!this.reduced.matches)this.rings.push({x:to.x,y:to.y,r,time:now});}
  this.last={...to,r,time:now};
  if(this.reduced.matches)return;
  this.trail.push({...to,time:now});this.trail=this.trail.slice(-40);
  const distance=from?Math.hypot(to.x-from.x,to.y-from.y):0;
  if(distance>2||fresh){
   for(let i=0;i<Math.min(5,Math.ceil(distance/10)+1);i++){
    const angle=Math.random()*Math.PI*2,spread=r*(.65+Math.random()*.3);
    this.particles.push({x:to.x+Math.cos(angle)*spread,y:to.y+Math.sin(angle)*spread,vx:Math.cos(angle)*(12+Math.random()*20),vy:Math.sin(angle)*20-14,r:1+Math.random()*2,time:now,life:450+Math.random()*300});
   }
  }
  this.particles=this.particles.slice(-100);this.rings=this.rings.slice(-6);
 }
 draw(ctx,now){
  if(!this.enabled)return;
  const reduced=this.reduced.matches;
  this.trail=this.trail.filter(p=>now-p.time<340);this.particles=this.particles.filter(p=>now-p.time<p.life);this.rings=this.rings.filter(p=>now-p.time<550);
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  if(!reduced){
   for(let i=1;i<this.trail.length;i++){
    const a=this.trail[i-1],b=this.trail[i],alpha=Math.max(0,1-(now-b.time)/340);
    ctx.strokeStyle=`rgba(210,255,231,${alpha*.32})`;ctx.lineWidth=2+alpha*5;ctx.shadowColor='#c4ffe1';ctx.shadowBlur=12;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
   }
   ctx.shadowBlur=0;
   for(const p of this.particles){const age=now-p.time,t=age/1000,alpha=1-age/p.life;ctx.fillStyle=`rgba(224,255,242,${alpha*.65})`;ctx.beginPath();ctx.arc(p.x+p.vx*t,p.y+p.vy*t,p.r*(.4+alpha*.6),0,Math.PI*2);ctx.fill();}
   for(const p of this.rings){const t=(now-p.time)/550;ctx.strokeStyle=`rgba(221,255,238,${(1-t)*.5})`;ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,p.r*(.55+t*.8),0,Math.PI*2);ctx.stroke();}
  }
  const p=this.last;
  if(p){const age=now-p.time,alpha=Math.max(0,1-Math.max(0,age-100)/220);
   if(alpha){const radius=p.r*(reduced?1:1+Math.sin(now/210)*.025);ctx.globalAlpha=alpha;
    if(!reduced){const halo=ctx.createRadialGradient(p.x,p.y,radius*.65,p.x,p.y,radius*1.12);halo.addColorStop(0,'#d5ffeb00');halo.addColorStop(.65,'#d5ffeb20');halo.addColorStop(1,'#d5ffeb00');ctx.fillStyle=halo;ctx.fillRect(p.x-radius*1.12,p.y-radius*1.12,radius*2.24,radius*2.24);}
    ctx.strokeStyle='#e3ffedaa';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#effff3';ctx.beginPath();ctx.arc(p.x,p.y,2.5,0,Math.PI*2);ctx.fill();
   }
  }
  ctx.restore();
 }
}
