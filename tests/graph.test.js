import test from 'node:test';
import assert from 'node:assert/strict';
import {newStep,sourceConfig} from '../public/model.js';
import {createGraph,connectGraph,removeGraphStep,validateGraph,graphSelection,graphAnalysisContext,graphUpstreamAnalysis,simulationErrors,routeSignalTypes,setGraphSignalTypes} from '../public/graph.js';

test('routing selects a subset of Super Signal types without changing monitoring',()=>{
 const w=createGraph('Routes','routed'),superStep=w.steps.find(s=>s.type==='super'),route=w.steps.find(s=>s.type==='route');
 const original=structuredClone(superStep.signalTypes),steps=w.steps.length;
 setGraphSignalTypes(w,route,['Margin compression','Governance risk']);
 assert.deepEqual(routeSignalTypes(w,route),['Margin compression']);
 assert.deepEqual(superStep.signalTypes,original);
 assert.equal(w.steps.length,steps);
 assert.ok(!w.edges.some(e=>e.condition==='Refinancing pressure'));
 setGraphSignalTypes(w,superStep,['Refinancing pressure']);
 assert.deepEqual(routeSignalTypes(w,route),[]);
 assert.ok(!w.edges.some(e=>e.from===route.id));
 const target=newStep('enrich');w.steps.push(target);
 assert.throws(()=>connectGraph(w,route.id,target.id,'Governance risk'),/named signal output/);
 setGraphSignalTypes(w,superStep,original);
 assert.deepEqual(routeSignalTypes(w,route),[]);
});

test('sample arrivals can run unfinished drafts without weakening activation checks',()=>{
 const w=createGraph('Draft','routed');
 w.steps.push(newStep('enrich'));
 w.edges=w.edges.filter(e=>e.condition!=='Margin compression');
 assert.deepEqual(simulationErrors(w),[]);
 assert.ok(validateGraph(w).length);
});
test('simulation guards missing sources and reachable loops',()=>{
 assert.ok(simulationErrors(createGraph('Empty')).length);
 const w=createGraph('Loop','basic');
 w.edges.push({id:'loop',from:w.steps.at(-1).id,to:w.steps[0].id});
 assert.match(simulationErrors(w).join(' '),/loop/);
});

test('blank graphs contain no hidden nodes or connections',()=>{
 const w=createGraph('Blank');assert.deepEqual(w.steps,[]);assert.deepEqual(w.edges,[]);assert.ok(validateGraph(w).length);
 w.steps.push(newStep('enrich'));assert.equal(w.edges.length,0);
});
test('match to enrich adds exactly one edge and never inserts or rewires',()=>{
 const w=createGraph('Basic','basic'),match=w.steps.find(s=>s.type==='match'),enrich=newStep('enrich'),ai=newStep('ai');
 w.steps.push(enrich,ai);const before=structuredClone(w.edges);
 connectGraph(w,match.id,ai.id);connectGraph(w,match.id,enrich.id);
 assert.deepEqual(w.edges.slice(0,2),before);assert.equal(w.edges.length,4);
 assert.ok(w.edges.some(e=>e.from===match.id&&e.to===ai.id));assert.ok(w.edges.some(e=>e.from===match.id&&e.to===enrich.id));
});
test('all nodes can be removed, preserving other cards without reconnecting them',()=>{
 for(const type of ['watch','super','match','route','enrich','ai','publish']){
 const w=createGraph('Routes','routed'),node=w.steps.find(s=>s.type===type);const before=w.steps.length,edges=w.edges.filter(e=>e.from!==node.id&&e.to!==node.id);
 removeGraphStep(w,node.id);assert.equal(w.steps.length,before-1);assert.deepEqual(w.edges,edges);assert.ok(validateGraph(w).length);
 }
});
test('connections reject cycles, duplicate edges and unintended merges',()=>{
 const w=createGraph('Routes','routed'),[context]=w.steps.filter(s=>s.type==='enrich'),ai=w.steps.find(s=>s.type==='ai');
 assert.throws(()=>connectGraph(w,ai.id,context.id),/loop/);
 assert.throws(()=>connectGraph(w,context.id,ai.id),/already connected/);
 const other=w.steps.filter(s=>s.type==='enrich')[1];assert.throws(()=>connectGraph(w,other.id,ai.id),/already has/);
});
test('context and publication inputs follow edges, not storage order or labels',()=>{
 const w=createGraph('Routes','routed'),contexts=w.steps.filter(s=>s.type==='enrich'),analyses=w.steps.filter(s=>s.type==='ai');
 w.steps.reverse();assert.deepEqual(graphAnalysisContext(w,analyses[0]).map(d=>d.id),['ratings','debt','models']);
 const inherited=newStep('enrich');inherited.enrichment.datasets=['exposures'];w.steps.push(inherited);
 const match=w.steps.find(s=>s.type==='match'),route=w.steps.find(s=>s.type==='route');w.edges=w.edges.filter(e=>!(e.from===match.id&&e.to===route.id));connectGraph(w,match.id,inherited.id);connectGraph(w,inherited.id,route.id);
 assert.deepEqual(graphSelection(w,contexts[0]).inherited,['exposures']);
 const publish=w.steps.find(s=>s.type==='publish'&&s.publishing.analysisStepId===analyses[0].id);assert.deepEqual(graphUpstreamAnalysis(w,publish).map(s=>s.id),[analyses[0].id]);
 w.edges=w.edges.filter(e=>e.to!==publish.id);assert.deepEqual(graphUpstreamAnalysis(w,publish),[]);
});
test('templates use editable explicit edges and validate after source configuration',()=>{
 for(const template of ['routed','analysis','summary']){
 const w=createGraph(template,template);const source=w.steps.find(s=>s.type==='watch');sourceConfig(source).url='https://example.com';
 assert.deepEqual(validateGraph(w),[]);
 }
});
