import {catalog,newStep,newSource,selectedSignalTypes,sourceErrors,publishingErrors,enrichmentDatasets,enrichmentSnapshot} from './model.js';

export function createGraph(name, template = 'blank', email) {
  const w = {id:crypto.randomUUID(),schemaVersion:5,name,active:false,steps:[],edges:[]};
  if (template === 'blank') return w;
  function add(type,x,y){const s=type==='watch'?newSource('web'):newStep(type,undefined,email);delete s.branch;s.x=x;s.y=y;w.steps.push(s);return s;}
  function edge(a,b,condition){w.edges.push({id:crypto.randomUUID(),from:a.id,to:b.id,...(condition?{condition}:{})});}
  const source=add('watch',360,40),superSignal=add('super',360,260),match=add('match',360,480);
  edge(source,superSignal);edge(superSignal,match);
  if(template==='basic')return w;
  if(template==='routed'){
    superSignal.signalTypes=['Refinancing pressure','Margin compression'];const route=add('route',360,700);edge(match,route);
    for(const [i,type] of superSignal.signalTypes.entries()){
      const x=100+i*520,context=add('enrich',x,960),ai=add('ai',x,1190),publish=add('publish',x,1420);
      context.enrichment.datasets=i?['financials','models']:['ratings','debt','models'];
      ai.prompt=`Analyze ${type.toLowerCase()} using the Super Signal and enriched context. Cite sources and dates; explain risks, offsets, and uncertainty.`;
      edge(route,context,type);edge(context,ai);edge(ai,publish);publish.publishing.content='analysis';publish.publishing.analysisStepId=ai.id;
    }
  }else if(template==='analysis'){
    let last=match;for(const [i,type]of ['enrich','extract','review','scenario'].entries()){const s=add(type,360,700+i*230);edge(last,s);last=s;}
  }else {const publish=add('publish',360,700);edge(match,publish);}
  return w;
}
export function ancestors(w,id){
  const found=new Set();function visit(current){for(const e of w.edges.filter(e=>e.to===current)){if(!found.has(e.from)){found.add(e.from);visit(e.from);}}}visit(id);
  return w.steps.filter(s=>found.has(s.id));
}
export function routeSignalTypes(w,route){
  const available=selectedSignalTypes(w.steps.find(s=>s.type==='super'));
  return available.filter(type=>!Array.isArray(route.signalTypes)||route.signalTypes.includes(type));
}
export function setGraphSignalTypes(w,step,types){
  const available=step.type==='super'?catalog.super.options:selectedSignalTypes(w.steps.find(s=>s.type==='super'));
  step.signalTypes=available.filter(type=>types.includes(type));
  if(step.type==='super')step.value=step.signalTypes[0]||'';
  for(const route of w.steps.filter(s=>s.type==='route')){
    if(Array.isArray(route.signalTypes))route.signalTypes=routeSignalTypes(w,route);
    const selected=routeSignalTypes(w,route);
    w.edges=w.edges.filter(edge=>edge.from!==route.id||selected.includes(edge.condition));
  }
  w.active=false;
}
export function connectionError(w,fromId,toId,condition){
  const from=w.steps.find(s=>s.id===fromId),to=w.steps.find(s=>s.id===toId);
  if(!from||!to)return 'Choose an existing card.';
  if(from===to||ancestors(w,from.id).some(s=>s.id===to.id))return 'This connection would create a loop.';
  if(w.edges.some(e=>e.from===fromId&&e.to===toId&&e.condition===condition))return 'These cards are already connected.';
  if(to.type==='watch')return 'Sources start the flow and do not have an input.';
  if(from.type==='watch'&&to.type!=='super')return 'Connect sources to Create / update Super Signal.';
  if(to.type==='super'&&from.type!=='watch')return 'Super Signal receives inputs from sources.';
  if(from.type==='super'&&to.type!=='match')return 'Connect Super Signal to Match my portfolio.';
  if(to.type!=='super'&&w.edges.some(e=>e.to===toId))return 'This input already has a connection. Select its arrow and remove it first.';
  if(from.type==='route'){
    if(!routeSignalTypes(w,from).includes(condition))return 'Choose a named signal output on the routing card.';
    if(w.edges.some(e=>e.from===fromId&&e.condition===condition))return 'This signal output is already connected. Branch further along its path to run multiple actions.';
  }
  return '';
}
export function connectGraph(w,from,to,condition){const error=connectionError(w,from,to,condition);if(error)throw Error(error);const e={id:crypto.randomUUID(),from,to,...(condition?{condition}:{})};w.edges.push(e);w.active=false;return e;}
export function removeGraphStep(w,id){w.steps=w.steps.filter(s=>s.id!==id);w.edges=w.edges.filter(e=>e.from!==id&&e.to!==id);w.active=false;}
export function inheritedDatasets(w,step){return [...new Set(ancestors(w,step.id).filter(s=>s.type==='enrich').flatMap(s=>s.enrichment.datasets))];}
export function graphSelection(w,step){const inherited=inheritedDatasets(w,step),additional=(step.enrichment?.datasets||[]).filter(id=>!inherited.includes(id));return{inherited,additional,effective:[...new Set([...inherited,...additional])]};}
export function graphSnapshot(w,step,missing=[]){const selection=graphSelection(w,step);const result=enrichmentSnapshot({...step,enrichment:{...step.enrichment,datasets:selection.effective}},missing);result.datasets.forEach(d=>d.inherited=selection.inherited.includes(d.id));return result;}
export function graphAnalysisContext(w,step){const ids=inheritedDatasets(w,step);return enrichmentDatasets.filter(d=>ids.includes(d.id));}
export function graphUpstreamAnalysis(w,step){return ancestors(w,step.id).filter(s=>s.type==='ai');}
export function simulationErrors(w,sourceId){
  const source=w.steps.find(s=>s.id===sourceId&&s.type==='watch')||w.steps.find(s=>s.type==='watch');
  if(!source)return ['Add a source to simulate an arrival.'];
  const errors=[],visited=new Set(),active=new Set();
  function visit(id){
    if(active.has(id)){errors.push('Remove the loop in this source path before simulating.');return;}
    if(visited.has(id))return;
    const step=w.steps.find(s=>s.id===id);
    if(!step){errors.push('Reconnect the missing step in this source path.');return;}
    if(step.type==='super'&&!selectedSignalTypes(step).length)errors.push('Select at least one signal type on Super Signal.');
    visited.add(id);active.add(id);
    for(const edge of w.edges.filter(e=>e.from===id))visit(edge.to);
    active.delete(id);
  }
  visit(source.id);return [...new Set(errors)];
}
export function validateGraph(w){
  const errors=[],sources=w.steps.filter(s=>s.type==='watch'),supers=w.steps.filter(s=>s.type==='super');
  if(!sources.length)errors.push('Add a source.');if(supers.length!==1)errors.push('Use one Create / update Super Signal card.');
  if(!w.steps.some(s=>s.type==='match'))errors.push('Add Match my portfolio.');
  if(!w.steps.some(s=>['publish','scenario','assign','job'].includes(s.type)))errors.push('Add an action such as Publish or Run a scenario.');
  for(const s of w.steps){
    const input=w.edges.filter(e=>e.to===s.id),output=w.edges.filter(e=>e.from===s.id),prior=ancestors(w,s.id),label=catalog[s.type]?.label||s.type;
    if(s.type!=='watch'&&!prior.some(p=>p.type==='watch'))errors.push(`${label}: connect this card to a source path.`);
    if(!output.length&&!['publish','scenario','assign','job'].includes(s.type))errors.push(`${label}: connect a next step.`);
    if(s.type!=='watch'&&s.type!=='super'&&!prior.some(p=>p.type==='super'))errors.push(`${label}: connect after Super Signal.`);
    if(!['watch','super','match'].includes(s.type)&&!prior.some(p=>p.type==='match'))errors.push(`${label}: connect after portfolio matching.`);
    if(s.type==='watch')errors.push(...Object.values(sourceErrors(s)));
    if(s.type==='super'&&!selectedSignalTypes(s).length)errors.push('Select signals to monitor.');
    if(s.type==='route'){
      if(!routeSignalTypes(w,s).length)errors.push('Route by signal type: select at least one signal type.');
      for(const type of routeSignalTypes(w,s))if(!output.some(e=>e.condition===type))errors.push(`Route by signal type: connect ${type}.`);
    }
    if(s.type==='ai'&&!s.prompt?.trim())errors.push('AI Analysis: enter a prompt.');
    if(s.type==='enrich'){try{graphSnapshot(w,s);}catch(error){errors.push(error.message);}}
    if(s.type==='review'&&!prior.some(p=>p.type==='extract'))errors.push('Review assumptions: connect after Extract scenario inputs.');
    if(s.type==='scenario'&&(!prior.some(p=>p.type==='review')||!prior.some(p=>p.type==='extract')))errors.push('Run a scenario: extraction and assumption review must be earlier on this path.');
    if(s.type==='publish'){errors.push(...Object.values(publishingErrors(s)));if(s.publishing.content==='analysis'&&!graphUpstreamAnalysis(w,s).some(p=>p.id===s.publishing.analysisStepId))errors.push('Publish: select an earlier AI Analysis output on this path.');}
    if(s.type!=='super'&&input.length>1)errors.push(`${label}: use one input connection.`);
  }
  for(const e of w.edges){const copy={...w,edges:w.edges.filter(x=>x!==e)};const error=connectionError(copy,e.from,e.to,e.condition);if(error)errors.push(error);}
  return [...new Set(errors)];
}
