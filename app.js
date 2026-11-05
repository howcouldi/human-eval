'use strict';
(() => {
  const M = window.SURVEY_MANIFEST;
  if (M.schema_version !== 'omnidrive.review.v1.1') throw Error('Unsupported manifest');
  const params = new URLSearchParams(location.search);
  const test = params.get('test') === '1' || M.test_only;
  const batch = params.get('batch');
  if (batch && !M.batches[batch]) throw Error('Unknown batch');
  const cases = batch ? M.cases.filter(c => M.batches[batch].includes(c.unit_id)) : M.cases;
  const $ = id => document.getElementById(id);
  const state = {index: 0, locale: 'zh', reviewer: '', answers: {}, storageOK: true};
  const words = {
    zh: {title:'驾驶数据标注质量问卷',reviewer:'匿名评者编号',export:'下载已完成答卷',draft:'下载全部草稿',import:'导入草稿',clear:'清除当前身份草稿',track:'视频证据',cur:'回到 CUR',errors:'错误类型（存在错误时至少选一项）',comment:'备注／错误位置（选填）',prev:'上一题',next:'下一题',decision:'决策问答质量',meta:'四字段行为标签核验',random:'随机问答核验',navigation:'导航与实际行车',execution:'标注与实际执行行为',question:'原始问题',answer:'原始回答',reason:'原始理由',scene:'场景事实',action:'动作合理性',reasoning:'推理支持',safety:'安全合理性',overall:'整体质量',verdict:'原标注可否直接使用',severity:'最严重问题',accuracy:'答案正确性',relevance:'切题程度',evidence:'场景证据支持',relation:'导航与 CUR 后行为的关系',alignment:'是否与目标时窗内实际执行一致',action_state:'Action · 动作',speed_state:'Speed · 速度',longitudinal_state:'Longitudinal · 纵向',lateral_state:'Lateral · 横向',input:'题目输入视频',executionTrack:'实际行为核验视频（含未来）',random_input:'随机 QA 的实际输入',correct:'正确',incorrect:'不正确',not_assessable:'无法判断／证据不足',not_applicable:'不适用（此任务不评价）',pass:'通过，可直接使用',minor_revision:'需要小修',major_error:'主要错误',none:'无明显问题',minor:'轻微',major:'主要',severe:'严重',executing:'一致，正在执行',valid_delayed:'导航有效，合理等待／让行',later_route_intent:'后续路线意图，当前尚未执行',conflict:'明确冲突／导航有误',supported:'一致，有依据',partly_supported:'部分一致',conflicted:'明确不一致',hallucination:'幻觉／事实错误',direction:'方向',speed:'速度',timing:'时序',trajectory:'轨迹',navigationError:'导航',other:'其他',dictionary_gap:'字典无法表达',correction:'修正类别',choose:'请选择',done:'本场景包已完成',incomplete:'尚未完成：请填写适用评分；标签错误时选择修正类别和错误类型。',saved:'草稿仅存当前浏览器，请下载交回组织者。',saveFailed:'浏览器保存失败，请及时下载。',preview:'当前为工程预览／校准包，不代表全量数据或人工质量结果。',test:'合成验收模式：导出不可作为真人结果。',mediaMissing:'视频不可用；不要凭标签猜测，请记录证据不足。',scopeWarning:'此轨道未确认与该 QA 输入完全一致，不可用额外帧补证据。',naMeta:'缺少权威标签／有效性声明，不生成或猜测标签。',noNav:'原始导航缺失，导航项不适用。',noAlignment:'未声明为实际行为描述，不能强制与示范轨迹一致。',noReviewer:'请先填写匿名评者编号（字母、数字、下划线、短横线）。',noRows:'没有可下载的已完成答卷；可下载草稿。',imported:'已导入',badImport:'导入失败：身份、版本、选项或本地草稿存在冲突。',clearConfirm:'清除当前评者的浏览器草稿？已下载文件不受影响。'},
    en: {title:'Driving Annotation Quality Review',reviewer:'Anonymous reviewer',export:'Download completed responses',draft:'Download all drafts',import:'Import drafts',clear:'Clear this profile',track:'Video evidence',cur:'Seek to CUR',errors:'Error types (select at least one when reporting an error)',comment:'Comment / error location (optional)',prev:'Previous',next:'Next',decision:'Decision QA Quality',meta:'MetaAction Verification',random:'Random QA Verification',navigation:'Navigation and Executed Behavior',execution:'Annotation–Execution Alignment',question:'Original question',answer:'Original answer',reason:'Original reason',scene:'Scene facts',action:'Action',reasoning:'Reasoning',safety:'Safety plausibility',overall:'Overall',verdict:'Can the annotation be used as-is?',severity:'Most severe issue',accuracy:'Accuracy',relevance:'Relevance',evidence:'Evidence support',relation:'Navigation relative to behavior after CUR',alignment:'Does the annotation match execution within the target window?',action_state:'Action',speed_state:'Speed',longitudinal_state:'Longitudinal',lateral_state:'Lateral',input:'Actual QA input',executionTrack:'Execution audit (includes future)',random_input:'Actual random QA input',correct:'Correct',incorrect:'Incorrect',not_assessable:'Cannot assess / insufficient evidence',not_applicable:'Not applicable',pass:'Pass, usable as-is',minor_revision:'Minor revision',major_error:'Major error',none:'None',minor:'Minor',major:'Major',severe:'Severe',executing:'Consistent and executing',valid_delayed:'Valid, reasonably delayed by yielding / waiting',later_route_intent:'Later route intent, not yet executing',conflict:'Conflict / incorrect navigation',supported:'Supported',partly_supported:'Partly supported',conflicted:'Conflicted',hallucination:'Hallucination / facts',direction:'Direction',speed:'Speed',timing:'Timing',trajectory:'Trajectory',navigationError:'Navigation',other:'Other',dictionary_gap:'Not expressible by dictionary',correction:'Corrected label',choose:'Choose',done:'This anchor is complete',incomplete:'Incomplete: rate applicable items; incorrect labels need corrections and error tags.',saved:'Drafts stay in this browser. Download and return responses to the organizer.',saveFailed:'Browser storage failed; download now.',preview:'Engineering preview / calibration only, not a population quality result.',test:'Synthetic test mode: exports are not human evidence.',mediaMissing:'Video unavailable. Do not infer correctness from the annotation.',scopeWarning:'Exact QA input scope is unverified. Do not use extra observations to support the answer.',naMeta:'Authoritative labels / validity unavailable; no invented labels.',noNav:'Navigation unavailable; this item does not apply.',noAlignment:'Not confirmed as executed behavior; no forced trajectory match.',noReviewer:'Enter an anonymous reviewer ID using letters, digits, underscores or hyphens.',noRows:'No completed responses to download; drafts remain available.',imported:'Imported',badImport:'Import rejected: identity, version, choices or existing draft conflict.',clearConfirm:'Clear browser drafts for this reviewer? Downloaded files remain unchanged.'}
  };
  const t = key => words[state.locale][key] || key;
  const text = value => typeof value === 'object' && value !== null ? value[state.locale] || value.zh || value.en || '' : value || '';
  const current = () => cases[state.index];
  const key = () => [M.schema_version,M.study_id,M.manifest_sha256,test?'test':'human',state.reviewer].join(':');
  const profileKey = [M.schema_version,M.study_id,M.manifest_sha256,test?'test':'human','profile'].join(':');
  function node(tag, value, cls) {const n=document.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;return n;}
  function toast(message) {$('toast').textContent=message;$('toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.display='none',5000);}
  function load() {try {state.answers=JSON.parse(localStorage.getItem(key())||'{}');state.storageOK=true;}catch (_) {state.answers={};state.storageOK=false;}}
  function save() {try {localStorage.setItem(key(),JSON.stringify(state.answers));localStorage.setItem(profileKey,JSON.stringify({reviewer:state.reviewer,locale:state.locale}));state.storageOK=true;}catch (_) {state.storageOK=false;}progress();}
  function annotation(c=current()) {if(!c)return {};const a=state.answers[c.unit_id]||(state.answers[c.unit_id]={annotation:{error_tags:[],comment:'',corrections:{}}});for(const q of c.questions)if(!q.applicable)a.annotation[q.id]='not_applicable';return a.annotation;}
  const wrongValues = new Set(['incorrect','major_error','conflicted','partly_supported','conflict','major','severe']);
  function wrong(c,a) {return c.questions.some(q=>wrongValues.has(a[q.id])||(Number.isInteger(a[q.id])&&a[q.id]<4));}
  function valid(c,a,complete=true) {
    if(!a||typeof a!=='object'||Array.isArray(a))return false;
    const ids=new Set([...c.questions.map(q=>q.id),'error_tags','comment','corrections']);
    if(Object.keys(a).some(k=>!ids.has(k)))return false;
    if(c.questions.some(q=>(complete||a[q.id]!==undefined)&&!q.options.includes(a[q.id])))return false;
    if(!Array.isArray(a.error_tags)||a.error_tags.some(v=>!M.rubric.error_tags.includes(v))||new Set(a.error_tags).size!==a.error_tags.length)return false;
    if(typeof a.comment!=='string'||!a.corrections||typeof a.corrections!=='object'||Array.isArray(a.corrections))return false;
    for(const [f,value] of Object.entries(a.corrections)){
      const m=c.meta_action.fields?.[f];if(a['meta.'+f]!=='incorrect'||!m||![...m.labels,'dictionary_gap'].includes(value)||value===m.label)return false;
    }
    if(complete&&c.questions.some(q=>q.id.startsWith('meta.')&&a[q.id]==='incorrect'&&!a.corrections[q.id.slice(5)]))return false;
    return !(complete&&wrong(c,a)&&!a.error_tags.length);
  }
  function capture() {
    const c=current();if(!c)return;const a=annotation();
    for(const q of c.questions){const checked=document.querySelector('input[name="'+q.id+'"]:checked');if(checked)a[q.id]=/^\d$/.test(checked.value)?Number(checked.value):checked.value;}
    a.error_tags=[...document.querySelectorAll('input[name="error_tag"]:checked')].map(n=>n.value);
    a.comment=$('comment').value;
    for(const f of ['action_state','speed_state','longitudinal_state','lateral_state']){
      const select=document.querySelector('select[data-field="'+f+'"]');
      if(a['meta.'+f]==='incorrect'&&select?.value)a.corrections[f]=select.value;else delete a.corrections[f];
    }
    state.answers[c.unit_id].updated_at=new Date().toISOString();save();
  }
  function progress() {
    const count=cases.filter(c=>valid(c,state.answers[c.unit_id]?.annotation)).length;
    $('progress').textContent=(state.locale==='zh'?'已完成 ':'Completed ')+count+' / '+cases.length;
    $('saveStatus').textContent=t(state.storageOK?'saved':'saveFailed');
    $('completion').textContent=current()&&valid(current(),state.answers[current().unit_id]?.annotation)?t('done'):t('incomplete');
    [...$('nav').children].forEach((b,i)=>b.className=(i===state.index?'active ':'')+(valid(cases[i],state.answers[cases[i].unit_id]?.annotation)?'done':''));
  }
  function renderMedia() {
    const c=current();const old=$('track').value;$('track').replaceChildren();
    for(const id of ['input','random_input','execution']){const m=c.media[id];if(!m)continue;const option=node('option',t(id==='execution'?'executionTrack':id));option.value=id;$('track').append(option);}
    if(c.media[old])$('track').value=old;
    const m=c.media[$('track').value];$('mediaError').textContent='';
    if(!m){$('video').removeAttribute('src');$('mediaError').textContent=t('mediaMissing');return;}
    const video=$('video');
    if(video.dataset.source!==m.src){
      video.dataset.source=m.src;video.removeAttribute('src');video.replaceChildren();
      for(const [src,type] of [[m.src,'video/mp4'],[m.webm_src,'video/webm']])if(src){const source=node('source');source.src=src;source.type=type;video.append(source);}
      video.onloadedmetadata=()=>{if(video.dataset.source===m.src)video.currentTime=m.cur_s;};video.load();
    }
    $('mediaNote').textContent=`CUR=${m.cur_s.toFixed(2)}s · ${m.observed_range_s.join(' → ')}s · source ${m.source_fps??'?'}Hz · encoded ${m.encoded_fps}fps · ${m.note}`+(($('track').value!=='execution'&&!m.input_scope_verified)?' '+t('scopeWarning'):'');
  }
  function renderCards() {
    const c=current(),a=annotation();$('cards').replaceChildren();
    for(const card of ['decision','meta','random','navigation','execution']){
      const questions=c.questions.filter(q=>q.card===card);if(!questions.length)continue;
      const box=node('div',undefined,'card');box.id='card-'+card;box.tabIndex=-1;box.dataset.card=card;box.append(node('h2',t(card)));
      if(card==='decision'||card==='random'){
        const qa=c[card==='decision'?'decision_qa':'random_qa'];
        for(const [k,label] of [['question','question'],['answer','answer'],['reason','reason']])if(qa[k]){box.append(node('strong',k==='answer'&&qa.answer_kind==='selected_final_policy'?(state.locale==='zh'?'待核验最终 Policy（不是原VQA答复）':'Selected final policy (not the preserved VQA answer)'):t(label)),node('div',text(qa[k]),'qa '+(k==='answer'?'answer':'')));}
      }
      if(card==='navigation')box.append(node('div',c.navigation.available?text(c.navigation.text):t('noNav'),'qa'));
      if(card==='execution'&&c.task_type!=='executed_behavior')box.append(node('p',t('noAlignment'),'muted'));
      for(const q of questions){
        const row=node('div',undefined,'criterion');row.id='question-'+q.id;row.tabIndex=-1;row.dataset.question=q.id;
        const short=q.id.split('.')[1];row.append(node('strong',t(short)));
        if(q.id.startsWith('meta.')){
          const m=c.meta_action.fields?.[short];
          if(m?.valid)row.append(node('p',m.label+' · '+text(m.definition)+' · '+(state.locale==='zh'?'目标窗：':'Target window: ')+(m.target_window_s??'?')+'s','tag'));else row.append(node('p',t('naMeta'),'muted'));
        }
        if(!q.applicable){row.append(node('div',t('not_applicable'),'na'));box.append(row);continue;}
        const options=node('div',undefined,'options');
        for(const value of q.options){const label=node('label');const input=node('input');input.type='radio';input.name=q.id;input.value=value;input.checked=a[q.id]===value;input.addEventListener('change',()=>{capture();if(q.id.startsWith('meta.'))renderCards();});label.append(input,document.createTextNode(t(value)));options.append(label);}
        row.append(options);
        if(q.id.startsWith('meta.')&&a[q.id]==='incorrect'){
          const label=node('label',t('correction'),'correction'),select=node('select');select.dataset.field=short;
          for(const value of ['',...c.meta_action.fields[short].labels.filter(v=>v!==c.meta_action.fields[short].label),'dictionary_gap']){const option=node('option',value?t(value):t('choose'));option.value=value;select.append(option);}
          select.value=a.corrections[short]||'';select.addEventListener('change',capture);label.append(select);row.append(label);
        }
        box.append(row);
      }
      $('cards').append(box);
    }
  }
  function goCase(index) {
    if(!Number.isInteger(index)||index<0||index>=cases.length){toast(state.locale==='zh'?'请输入有效 case 编号':'Enter a valid case number');return;}
    capture();state.index=index;render();$('caseTitle').scrollIntoView({block:'start'});
  }
  function goQuestion(id) {
    if(!id)return;capture();const target=document.getElementById(id);if(!target)return;
    target.scrollIntoView({block:'start'});target.focus({preventScroll:true});
  }
  function renderQuickNavigation() {
    const zh=state.locale==='zh';
    $('caseJumpLabel').textContent=zh?'跳到 case':'Go to case';$('jumpCase').textContent=zh?'跳转':'Go';
    $('caseJump').max=cases.length;$('caseJump').value=state.index+1;
    $('caseCount').textContent=zh?'共 '+cases.length+' 个 case':'of '+cases.length+' cases';
    $('browseHint').textContent=zh?'无需填写，可直接查看任意 case 或问题；已填内容自动保留。':'Browse any case or question without answering; partial answers are kept.';
    $('questionJumpLabel').textContent=zh?'定位具体问题':'Jump to a question';
    $('questionNav').replaceChildren();$('questionJump').replaceChildren();
    const placeholder=node('option',zh?'选择要查看的问题':'Choose a question');placeholder.value='';$('questionJump').append(placeholder);
    const c=current();if(!c)return;
    for(const card of ['decision','meta','random','navigation','execution'])if(c.questions.some(q=>q.card===card)){
      const button=node('button',t(card));button.type='button';button.dataset.target=card;button.addEventListener('click',()=>goQuestion('card-'+card));$('questionNav').append(button);
    }
    for(const q of c.questions){const option=node('option',t(q.card)+' · '+t(q.id.split('.')[1]));option.value=q.id;$('questionJump').append(option);}
  }
  function render() {
    document.documentElement.lang=state.locale==='zh'?'zh-CN':'en';$('locale').value=state.locale;
    $('title').textContent=t('title');document.querySelectorAll('[data-i18n]').forEach(n=>n.textContent=t(n.dataset.i18n));
    $('study').textContent=M.study_id+' · '+M.schema_version;
    $('warning').textContent=(M.pool!=='probability_audit'?t('preview'):'')+(test?' '+t('test'):'');
    $('nav').replaceChildren();cases.forEach((c,i)=>{const b=node('button',c.display_id);b.addEventListener('click',()=>goCase(i));$('nav').append(b);});
    if(!current()){$('caseTitle').textContent='No cases';return;}
    const c=current(),a=annotation();$('caseTitle').textContent=c.display_id;$('source').textContent=c.source;
    $('warnings').textContent=(c.warnings||[]).map(text).join(' ');renderMedia();renderCards();renderQuickNavigation();
    $('errorTags').replaceChildren();for(const value of M.rubric.error_tags){const label=node('label');const input=node('input');input.type='checkbox';input.name='error_tag';input.value=value;input.checked=a.error_tags.includes(value);input.addEventListener('change',capture);label.append(input,document.createTextNode(t(value==='navigation'?'navigationError':value)));$('errorTags').append(label);}
    $('comment').value=a.comment||'';$('prev').disabled=state.index===0;$('next').disabled=state.index===cases.length-1;progress();
  }
  function exportRows(drafts) {
    capture();if(!/^[A-Za-z0-9_-]{1,64}$/.test(state.reviewer)){toast(t('noReviewer'));return;}
    const rows=cases.filter(c=>state.answers[c.unit_id]&&(drafts||valid(c,state.answers[c.unit_id].annotation))).map(c=>({schema_version:M.schema_version,study_id:M.study_id,manifest_sha256:M.manifest_sha256,rubric_sha256:M.rubric_sha256,unit_id:c.unit_id,reviewer_id:state.reviewer,annotation:state.answers[c.unit_id].annotation,completed:valid(c,state.answers[c.unit_id].annotation),synthetic_test:Boolean(test),updated_at:state.answers[c.unit_id].updated_at}));
    if(!rows.length){toast(t('noRows'));return;}
    const url=URL.createObjectURL(new Blob([rows.map(r=>JSON.stringify(r)).join('\n')+'\n'],{type:'application/x-ndjson;charset=utf-8'}));
    const link=node('a');link.href=url;link.download=M.study_id+'_'+state.reviewer+(drafts?'_draft':'')+'.jsonl';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));return value;}
  $('import').addEventListener('change',async e=>{
    try{
      if(!/^[A-Za-z0-9_-]{1,64}$/.test(state.reviewer))throw Error();
      const rows=(await e.target.files[0].text()).split(/\r?\n/).filter(s=>s.trim()).map(JSON.parse),pending=JSON.parse(JSON.stringify(state.answers));
      for(const r of rows){const c=cases.find(c=>c.unit_id===r.unit_id);
        if(!c||r.schema_version!==M.schema_version||r.study_id!==M.study_id||r.manifest_sha256!==M.manifest_sha256||r.rubric_sha256!==M.rubric_sha256||r.reviewer_id!==state.reviewer||typeof r.synthetic_test!=='boolean'||r.synthetic_test!==Boolean(test)||typeof r.completed!=='boolean'||!valid(c,r.annotation,r.completed))throw Error();
        const existing=pending[c.unit_id]?.annotation;
        const hasEdits=existing&&(c.questions.some(q=>q.applicable&&existing[q.id]!==undefined)||existing.comment||existing.error_tags?.length);
        if(hasEdits&&JSON.stringify(stable(existing))!==JSON.stringify(stable(r.annotation)))throw Error();
        pending[c.unit_id]={annotation:r.annotation,updated_at:r.updated_at};
      }state.answers=pending;save();render();toast(t('imported')+' '+rows.length);
    }catch(_){toast(t('badImport'));}finally{e.target.value='';}
  });
  $('comment').addEventListener('input',capture);
  $('locale').addEventListener('change',()=>{capture();state.locale=$('locale').value;save();render();});
  $('reviewer').addEventListener('change',()=>{capture();state.reviewer=$('reviewer').value.trim();load();save();render();});
  $('track').addEventListener('change',renderMedia);
  $('cur').addEventListener('click',()=>{$('video').pause();$('video').currentTime=current().media[$('track').value].cur_s;});
  function frame(delta){const video=$('video'),m=current().media[$('track').value];video.pause();video.currentTime=Math.max(0,Math.min(m.duration_s-1/m.encoded_fps,video.currentTime+delta/m.encoded_fps));}
  $('backFrame').addEventListener('click',()=>frame(-1));$('nextFrame').addEventListener('click',()=>frame(1));
  $('video').addEventListener('timeupdate',()=>{$('time').textContent=$('video').currentTime.toFixed(2)+'s';});
  $('video').addEventListener('error',()=>{$('mediaError').textContent=t('mediaMissing');});
  $('prev').addEventListener('click',()=>goCase(state.index-1));$('next').addEventListener('click',()=>goCase(state.index+1));
  $('jumpCase').addEventListener('click',()=>goCase(Number($('caseJump').value)-1));
  $('caseJump').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();goCase(Number($('caseJump').value)-1);}});
  $('questionJump').addEventListener('change',()=>goQuestion('question-'+$('questionJump').value));
  $('export').addEventListener('click',()=>exportRows(false));$('draft').addEventListener('click',()=>exportRows(true));
  $('clear').addEventListener('click',()=>{if(confirm(t('clearConfirm'))){state.answers={};save();render();}});
  try{const p=JSON.parse(localStorage.getItem(profileKey)||'{}');state.reviewer=p.reviewer||'';state.locale=p.locale==='en'?'en':'zh';}catch(_){}
  $('reviewer').value=state.reviewer;load();render();
})();
