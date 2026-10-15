export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export function coverPoint(p,vw,vh,w,h){const s=Math.max(w/vw,h/vh);return {x:(1-p.x)*vw*s+(w-vw*s)/2,y:p.y*vh*s+(h-vh*s)/2};}
export class BreathDetector{
 constructor(){this.reset();}
 reset(){this.since=null;this.last=null;this.baseline=null;this.progress=0;}
 update(metrics,now,sensitivity){
  if(this.last!==null&&now-this.last>350)this.since=null;this.last=now;
  if(!metrics){this.since=null;this.progress=0;return false;}
  const {openness,width,pucker}=metrics,s=clamp(sensitivity/100);
  if(this.baseline===null)this.baseline=width;
  const narrow=width/Math.max(.01,this.baseline)<.90+s*.08;
  const candidate=openness>(.055-.025*s)&&openness<(.65+s*.25)&&(pucker>(.48-.35*s)||narrow);
  if(!candidate){this.baseline=this.baseline*.97+width*.03;this.since=null;this.progress=0;return false;}
  if(this.since===null)this.since=now;
  this.progress=clamp((now-this.since)/(750-s*480));
  return this.progress>=1;
 }
}
