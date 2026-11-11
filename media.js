'use strict';
window.FROZEN_MEDIA = (()=>{
  const NS='http://www.w3.org/2000/svg';
  const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
  const svg=(tag,attributes={})=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attributes))n.setAttribute(k,v);return n;};
  const f=(x,n=2)=>Number(x).toFixed(n);
  function pathSegments(points){
    const parts=[];let part=[];
    for(const p of points){if(p){part.push(p);}else{if(part.length)parts.push(part);part=[];}}
    if(part.length)parts.push(part);
    return parts.filter(p=>p.length>=2).map(p=>'M'+p.map(v=>`${f(v[0])},${f(v[1])}`).join(' L'));
  }
  function chart(key,data,locale){
    const zh=locale==='zh',speed=key==='speed';
    const box=node('div',null,'curve-panel');
    const title=node('h3',speed?(zh?'速度 · m/s':'Speed · m/s'):(zh?'加速度 · m/s²':'Acceleration · m/s²'));
    const past=data.history[key],future=data.future[key],recent=past.at(-1);
    if(recent)title.append(node('span',(zh?'历史末段 ':'Latest history ')+f(recent.value)+(speed?' m/s':' m/s²'),'curve-status'));
    box.append(title);
    const all=[...past,...future],canvas=svg('svg',{viewBox:'0 0 600 190',role:'img','aria-label':title.textContent});
    const x0=-2,x1=4,left=54,right=586,top=18,bottom=150;
    const range=speed?window.SURVEY_MANIFEST.presentation.speed_axis_mps:window.SURVEY_MANIFEST.presentation.acceleration_axis_mps2;
    const [low,high]=range;
    canvas.dataset.yMin=low;canvas.dataset.yMax=high;
    const X=t=>left+(t-x0)/(x1-x0)*(right-left),Y=v=>bottom-(v-low)/(high-low)*(bottom-top);
    canvas.append(svg('rect',{x:X(0),y:top,width:right-X(0),height:bottom-top,fill:'#fff3e5'}));
    const ticks=speed?4:6;
    for(let i=0;i<=ticks;i++){
      const v=low+(high-low)*i/ticks,y=Y(v),label=svg('text',{x:left-8,y:y+4,'text-anchor':'end',fill:'#536174'});label.textContent=String(v);
      canvas.append(svg('line',{x1:left,x2:right,y1:y,y2:y,stroke:'#dde4ed'}),label);
    }
    for(let t=-2;t<=4;t++){
      const label=svg('text',{x:X(t),y:171,'text-anchor':'middle',fill:'#536174'});label.textContent=t===0?(zh?'0 当前':'0 now'):String(t);
      canvas.append(label);
    }
    const axis=svg('text',{x:right,y:188,'text-anchor':'end',fill:'#536174'});axis.textContent=zh?'时间 / s':'Time / s';canvas.append(axis);
    canvas.append(svg('line',{x1:X(0),x2:X(0),y1:top,y2:bottom,stroke:'#65758b','stroke-dasharray':'4 3'}));
    for(const [values,color]of [[past,'#286fc4'],[future,'#dc7c19']]){
      if(values.length>1)canvas.append(svg('polyline',{points:values.map(p=>`${X(p.t)},${Y(p.value)}`).join(' '),fill:'none',stroke:color,'stroke-width':2.5}));
      for(const p of values){const dot=svg('circle',{cx:X(p.t),cy:Y(p.value),r:3,fill:color});const hint=svg('title');hint.textContent=`${f(p.t)} s: ${f(p.value)} ${speed?'m/s':'m/s²'} [${p.support.map(t=>f(t)).join(', ')} s]`;dot.append(hint);canvas.append(dot);}
    }
    box.append(canvas);return box;
  }
  function render(c,locale){
    const zh=locale==='zh',v=c.visual,root=document.getElementById('frozenMedia');root.replaceChildren();
    const controls=node('div',null,'trajectory-controls');
    const layers={};
    for(const [key,title]of [['four',zh?'未来4秒 · 细实线':'Next 4 seconds · thin line'],['metres',zh?'未来15米 · 每米一点':'Next 15 metres · 1 m dots']]){
      const label=node('label'),input=node('input');input.type='checkbox';input.checked=true;input.dataset.layer=key;
      const swatch=node('i',null,'swatch '+key);label.append(input,swatch,document.createTextNode(title));controls.append(label);layers[key]=input;
      input.addEventListener('change',()=>root.querySelectorAll(`[data-path="${key}"]`).forEach(n=>n.style.display=input.checked?'':'none'));
    }
    controls.append(node('span',zh?'仅当前帧投影':'Projected on current frame only'));
    root.append(controls);
    const centered=['wod','lead360'].includes(c.source);
    const scroll=node('div',null,'mosaic-scroll'+(centered?' centered':'')),mosaic=node('div',null,'mosaic');scroll.append(mosaic);
    for(const row of v.rows){
      const strip=node('div',null,'frame-row'+(row.current?' current':''));strip.dataset.time=row.time_s;
      for(const [i,image]of row.images.entries()){
        const cell=node('div',null,'camera-cell');cell.style.width=(216*image.width/image.height)+'px';
        const img=node('img');img.src=image.src;img.alt=`${image.view}, ${f(image.time_s)} s`;img.width=image.width;img.height=image.height;img.loading=row.current?'eager':'lazy';
        cell.append(img);if(row===v.rows[0])cell.append(node('span',(zh?['左前','正前','右前']:['Front left','Front','Front right'])[i],'camera-label'));
        if(row.current){
          const camera=v.cameras.find(p=>p.view===image.view),overlay=svg('svg',{viewBox:`0 0 ${camera.width} ${camera.height}`,'aria-hidden':'true'});
          for(const key of ['metres','four']){
            const group=svg('g',{'data-path':key});
            for(const d of pathSegments(camera.paths[key])){
              group.append(svg('path',{d,class:'path-shadow'}),svg('path',{d,class:'path-'+key}));
            }
            overlay.append(group);
          }
          // All spatial knots are above both continuous waypoint line layers.
          const knots=svg('g',{'data-path':'metres','data-layer-kind':'spatial-knots'});
          const scale=camera.height/216;
          for(const point of camera.spatial_knots){
            if(!point.uv)continue;
            const [x,y]=point.uv;
            if(x<0||y<0||x>camera.width||y>camera.height)continue;
            const dot=svg('circle',{cx:x,cy:y,r:2.3*scale,class:'spatial-knot','data-distance':point.s});
            const hint=svg('title');hint.textContent=`${f(point.s)} m / ${f(point.t)} s`;dot.append(hint);knots.append(dot);
          }
          overlay.append(knots);
          cell.append(overlay);
        }
        strip.append(cell);
      }
      strip.append(node('span',row.current?(zh?'当前 · 0 s':'Current · 0 s'):`${f(row.time_s)} s`,'frame-time'));
      mosaic.append(strip);
    }
    root.append(scroll);
    const precision=v.metres>0&&v.metres<.01?3:2;
    let detail=zh?`4秒轨迹：${f(v.four_seconds)} s；15米轨迹：${f(v.metres,precision)} m / ${f(v.metres_seconds)} s。`:`4-second path: ${f(v.four_seconds)} s; 15-metre path: ${f(v.metres,precision)} m / ${f(v.metres_seconds)} s. `;
    if(v.metres<14.999)detail+=zh?' 不足15米，按有效记录显示实际长度。':' Shorter than 15 metres; all supported length is retained.';
    if(v.metres<.05)detail+=zh?` 可用未来${f(v.available_seconds)}秒内近乎静止。`:` Nearly stationary over the available ${f(v.available_seconds)} seconds.`;
    detail+=zh?' 未来路径为地面投影；静止或视野外的线段可能不可见。':' Future paths use ground-plane projection; stationary or out-of-view segments may be invisible.';
    root.append(node('p',detail,'trajectory-detail'));
    const plots=node('div',null,'kinematics');plots.append(chart('speed',v.curves,locale),chart('acceleration',v.curves,locale));root.append(plots);
    root.append(node('p',zh?'蓝色：历史；橙色：未来4秒。曲线由轨迹位移及实际采样间隔估算，历史加速度仅使用历史样本。':'Blue: history; orange: next 4 seconds. Curves are estimated from displacement and sample intervals; historical acceleration uses past samples only.','curve-note'));
    const nav=node('div',null,'navigation-hint');nav.append(node('strong',zh?'未来导航意图':'Future route intent'),document.createTextNode(c.navigation.text[locale]||c.navigation.text.zh));root.append(nav);
  }
  return {render};
})();
