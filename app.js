import {clamp,coverPoint,BreathDetector} from './logic.js';
import {WipeEffects} from './effects.js';
const effects=new WipeEffects();
const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d'),video=$('video');
const make=()=>document.createElement('canvas');
const mask=make(),mc=mask.getContext('2d'),fog=make(),fc=fog.getContext('2d'),background=make(),bc=background.getContext('2d'),texture=make(),tc=texture.getContext('2d');
let w=0,h=0,stream=null,face=null,hand=null,running=false,busy=false,lastTime=0,lastDetect=0,lastVideo=-1,blowing=false,simUntil=0,point=null,pointer=null,handSeen=0,frame=0;
const detector=new BreathDetector();
let messageTimer;
function message(text,error=false){clearTimeout(messageTimer);$('message').textContent=text;$('message').classList.toggle('error',error);$('message').classList.add('visible');if(!error)messageTimer=setTimeout(()=>$('message').classList.remove('visible'),5500);}
function resize(){
 const old=make();old.width=mask.width;old.height=mask.height;old.getContext('2d').drawImage(mask,0,0);
 w=Math.round(innerWidth);h=Math.round(innerHeight);
 for(const c of [canvas,mask,fog,background]){c.width=w;c.height=h;}
 if(old.width)mc.drawImage(old,0,0,w,h);
 const g=bc.createLinearGradient(0,0,w,h);g.addColorStop(0,'#213f40');g.addColorStop(.55,'#748d74');g.addColorStop(1,'#183f3e');bc.fillStyle=g;bc.fillRect(0,0,w,h);
 bc.filter='blur(35px)';for(let i=0;i<28;i++){bc.fillStyle=i%3?'#193c35':'#c2d4a477';bc.beginPath();bc.ellipse(w*(.42+Math.sin(i*31)*.45),h*(.5+Math.cos(i*17)*.6),35+(i%4)*18,h*.45,Math.sin(i)*.4,0,Math.PI*2);bc.fill();}bc.filter='none';
 texture.width=256;texture.height=256;const data=tc.createImageData(256,256);for(let i=0;i<data.data.length;i+=4){data.data[i]=data.data[i+1]=data.data[i+2]=230;data.data[i+3]=Math.random()*30;}tc.putImageData(data,0,0);
 point=null;pointer=null;effects.clear();
}
function drawVideo(target,blur=0){
 target.save();if(blur)target.filter=`blur(${blur}px)`;
 if(running&&video.readyState>=2){const s=Math.max(w/video.videoWidth,h/video.videoHeight);const dw=video.videoWidth*s,dh=video.videoHeight*s;target.translate(w,0);target.scale(-1,1);target.drawImage(video,(w-dw)/2,(h-dh)/2,dw,dh);}else target.drawImage(background,0,0);
 target.restore();
}
function wipe(from,to,r){
 effects.emit(from,to,r);
 mc.save();mc.globalCompositeOperation='destination-out';
 const distance=from?Math.hypot(to.x-from.x,to.y-from.y):0,n=Math.max(1,Math.ceil(distance/(r*.3)));
 for(let i=1;i<=n;i++){const x=from?from.x+(to.x-from.x)*i/n:to.x,y=from?from.y+(to.y-from.y)*i/n:to.y;
 const g=mc.createRadialGradient(x,y,r*.65,x,y,r);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');mc.fillStyle=g;mc.fillRect(x-r,y-r,r*2,r*2);}
 mc.restore();
}
function render(now){
 const dt=Math.min((now-lastTime)/1000,.1);lastTime=now;
 if(running&&video.readyState>=2&&now-lastDetect>66&&lastVideo!==video.currentTime){lastDetect=now;lastVideo=video.currentTime;try{detect(now);}catch(e){stop();message('识别运行失败，请重新启动摄像头。'+e.message,true);}}
 if(blowing||now<simUntil){mc.fillStyle=`rgba(255,255,255,${1-Math.exp(-dt*1.15)})`;mc.fillRect(0,0,w,h);}
 drawVideo(ctx);
 fc.clearRect(0,0,w,h);drawVideo(fc,18);fc.fillStyle='rgba(218,234,228,.63)';fc.fillRect(0,0,w,h);fc.fillStyle=fc.createPattern(texture,'repeat');fc.fillRect(0,0,w,h);
 // Tiny condensation beads stay fixed to the glass, not the camera image.
 for(let i=0;i<95;i++){const x=((i*127.17)%1)*w,y=((i*83.39)%1)*h,r=1+(i%4)*.45;fc.strokeStyle='#f4fff83b';fc.lineWidth=.8;fc.beginPath();fc.ellipse(x,y,r,r*1.4,0,0,Math.PI*2);fc.stroke();}
 fc.globalCompositeOperation='destination-in';fc.drawImage(mask,0,0);fc.globalCompositeOperation='source-over';ctx.drawImage(fog,0,0);
 effects.draw(ctx,now);
 frame=requestAnimationFrame(render);
}
function detect(now){
 const result=face.detectForVideo(video,now),landmarks=result.faceLandmarks[0];
 let metrics=null;
 if(landmarks){const dist=(a,b)=>Math.hypot((landmarks[a].x-landmarks[b].x)*video.videoWidth,(landmarks[a].y-landmarks[b].y)*video.videoHeight);const mouth=Math.max(1,dist(61,291));const shapes=Object.fromEntries((result.faceBlendshapes[0]?.categories||[]).map(c=>[c.categoryName,c.score]));metrics={openness:dist(13,14)/mouth,width:mouth/Math.max(1,dist(234,454)),pucker:Math.max(shapes.mouthPucker||0,shapes.mouthFunnel||0)};}
 blowing=detector.update(metrics,now,+$('sensitivity').value);
 $('faceDot').classList.toggle('active',!!landmarks);$('faceStatus').textContent=landmarks?(blowing?'吹气中':'已识别'):'未检测到';
 const percent=Math.round(detector.progress*100);$('breathValue').textContent=percent+'%';$('breathBar').style.width=percent+'%';
 $('liveHint').textContent=blowing?'雾气正在凝结 · 伸出手，擦出一片清晰':!landmarks?'请将脸移入画面，保持光线充足':'微张嘴、收拢嘴唇，持续吹气约半秒';
 const hands=hand.detectForVideo(video,now).landmarks,lm=hands[0];
 $('handDot').classList.toggle('active',!!lm);
 if(!lm){point=null;$('handStatus').textContent='未检测到';return;}
 const d=(a,b)=>Math.hypot(lm[a].x-lm[b].x,(lm[a].y-lm[b].y)*video.videoHeight/video.videoWidth);
 const extended=[[8,6],[12,10],[16,14],[20,18]].filter(([tip,pip])=>d(tip,0)>d(pip,0)*1.16).length;
 const palm=extended>=3;
 if(!palm&&d(8,0)<d(6,0)*1.1){point=null;$('handStatus').textContent='请伸出食指';return;}
 const landmark=palm?{x:(lm[0].x+lm[5].x+lm[9].x+lm[17].x)/4,y:(lm[0].y+lm[5].y+lm[9].y+lm[17].y)/4}:lm[8];
 const raw=coverPoint(landmark,video.videoWidth,video.videoHeight,w,h),r=+$('radius').value*(palm?1.65:1);
 if(point&&(now-handSeen>180||point.palm!==palm||Math.hypot(point.x-raw.x,point.y-raw.y)>Math.min(w,h)*.3))point=null;
 const next=point?{x:point.x+(raw.x-point.x)*.48,y:point.y+(raw.y-point.y)*.48}:{...raw};
 wipe(point,next,r);point={...next,r,palm};handSeen=now;$('handStatus').textContent=palm?'手掌擦拭':'食指擦拭';
}
async function loadModels(){
 if(face&&hand)return;
 message('正在加载人脸与手部模型，首次启动可能需要一些时间…');
 const mp=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/vision_bundle.mjs');
 const files=await mp.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm');
 async function create(delegate){
  let f=null,hh=null;
  try{f=await mp.FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',delegate},runningMode:'VIDEO',numFaces:1,outputFaceBlendshapes:true});hh=await mp.HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate},runningMode:'VIDEO',numHands:1});return [f,hh];}catch(e){f?.close();hh?.close();throw e;}
 }
 try{[face,hand]=await create('GPU');}catch{message('图形加速不可用，正在尝试兼容模式…');[face,hand]=await create('CPU');}
}
function stop(){effects.clear();running=false;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;blowing=false;point=null;detector.reset();lastVideo=-1;document.body.classList.remove('live');$('liveHint').hidden=true;$('cameraState').textContent='● 摄像头未开启';$('start').textContent='开启摄像头';$('faceStatus').textContent='等待人脸';$('handStatus').textContent='等待手势';$('faceDot').classList.remove('active');$('handDot').classList.remove('active');$('breathValue').textContent='0%';$('breathBar').style.width='0%';}
async function start(){
 if(busy)return;if(running){stop();message('摄像头已关闭，可继续使用模拟吹气。');return;}
 busy=true;$('start').disabled=true;
 let phase='camera';
 try{
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('请使用 localhost 或 HTTPS 打开此页面。');
  message('请允许浏览器访问摄像头…');
  stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:960},height:{ideal:720}},audio:false});
  video.srcObject=stream;await video.play();phase='models';await loadModels();
  running=true;detector.reset();document.body.classList.add('live');$('liveHint').hidden=false;$('cameraState').textContent='● 摄像头已连接';$('start').textContent='关闭摄像头';
  stream.getVideoTracks()[0].addEventListener('ended',()=>{if(running){stop();message('摄像头连接已断开，请重新启动。',true);}});
  message('先自然放松嘴唇，再做吹气动作。伸出食指或张开手掌即可擦拭。');
 }catch(e){stop();const errors={NotAllowedError:'摄像头授权被拒绝。请在浏览器的网站设置中允许摄像头，然后重试。',NotFoundError:'没有找到摄像头，请连接设备后重试。',NotReadableError:'摄像头被其他程序占用或无法读取，请关闭占用程序后重试。'};message(phase==='models'?'模型加载失败，请检查网络是否可访问 jsDelivr 和 Google Storage，再点击开启摄像头重试。':(errors[e.name]||e.message),true);console.error(e);}
 finally{busy=false;$('start').disabled=false;}
}
$('start').onclick=start;
$('effects').onchange=()=>{effects.enabled=$('effects').checked;effects.clear();};
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('settings').open=false;});
document.addEventListener('pointerdown',e=>{if(!$('settings').contains(e.target))$('settings').open=false;});
$('simulate').onclick=()=>{$('settings').open=false;simUntil=performance.now()+3000;message('模拟吹气 3 秒：等待起雾后，用鼠标或手指拖动擦拭。');};
$('reset').onclick=()=>{effects.clear();mc.clearRect(0,0,w,h);simUntil=0;blowing=false;detector.reset();message('雾气已清空。再次吹气可以重新起雾。');};
$('sensitivity').oninput=()=>{$('sensitivityValue').value=$('sensitivity').value;detector.reset();};$('radius').oninput=()=>{$('radiusValue').value=$('radius').value+' px';};
canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);pointer={x:e.clientX,y:e.clientY,id:e.pointerId};wipe(null,pointer,+$('radius').value);};
canvas.onpointermove=e=>{if(pointer&&pointer.id===e.pointerId){const next={x:e.clientX,y:e.clientY,id:e.pointerId};wipe(pointer,next,+$('radius').value);pointer=next;}};
canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=()=>{pointer=null;};
window.addEventListener('resize',resize);window.addEventListener('pagehide',()=>{stop();face?.close();hand?.close();face=hand=null;cancelAnimationFrame(frame);});window.addEventListener('pageshow',e=>{if(e.persisted){lastTime=performance.now();frame=requestAnimationFrame(render);}});
resize();frame=requestAnimationFrame(render);
