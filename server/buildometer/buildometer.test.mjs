import {test} from 'node:test';import assert from 'node:assert/strict';
import {deriveJira,applyDeployments,emptyData} from './derive.ts';import {createHandler} from './worker.ts';import {acquireJira} from './jira.ts';
const now='2026-10-18T12:00:00.000Z';
const issue=(extra={})=>({key:'DEMO-1',type:'Story',subtask:false,status:'open',category:'new',created:'2026-10-10T00:00:00.000Z',updated:now,resolved:null,resolution:null,parent:null,labels:[],components:[],points:null,originalSeconds:null,remainingSeconds:null,sprintIds:[],history:[],historyComplete:true,...extra});
const facts=(issues=[])=>({fetchedAt:now,issues,statuses:{open:'new',done:'done'},fields:{points:'estimate',sprint:'sprint'},sprints:[]});
test('missing scope/estimates are never zero percent or invented velocity',()=>{const d=deriveJira(facts([issue()]));assert.equal(d.metrics.completion.value,null);assert.equal(d.metrics.velocity.value,null);assert.equal(d.metrics.remaining.value,1);assert.deepEqual(d.series.burndown,[]);});
test('throughput requires the actual Done transition, independent of resolution metadata',()=>{const d=deriveJira(facts([issue({status:'done',category:'done',history:[{at:'2026-10-17T12:00:00.000Z',changes:[{field:'status',from:'open',to:'done'}]}]})]));assert.equal(d.metrics.throughput.value,1);assert.equal(d.series.throughput.reduce((n,p)=>n+p.value,0),1);});
test('real sprint membership produces a remaining-work trajectory, no ideal burn',()=>{const f=facts([issue({sprintIds:['1'],status:'done',category:'done',history:[{at:'2026-10-17T12:00:00.000Z',changes:[{field:'status',from:'open',to:'done'}]}]})]);f.sprints=[{id:'1',state:'active',start:'2026-10-11T00:00:00.000Z',end:'2026-10-20T00:00:00.000Z'}];const d=deriveJira(f);assert.ok(d.series.burndown.length>1);assert.equal(d.series.burndown[0].value,1);assert.equal(d.series.burndown.at(-1).value,0);assert.equal(d.metrics.completion.value,null);f.issues[0].historyComplete=false;assert.equal(deriveJira(f).series.burndown.length,0);});
test('explicit bug labels retain classification/Done/reopen history; rework is not inferred',()=>{const d=deriveJira(facts([issue({labels:['bug'],status:'done',category:'done',resolved:'2026-10-12T00:00:00.000Z',history:[{at:'2026-10-12T00:00:00.000Z',changes:[{field:'status',from:'open',to:'done'}]}]})]));assert.equal(d.metrics.bugDuration.value,48);assert.equal(d.metrics.bugEliminated.value,1);assert.equal(d.metrics.rework.value,null);assert.equal(d.series.bugOpen.length,14);});
test('deployment buckets exclude previews/failures/build-only and opening boundary',()=>{const d=emptyData(now);const r={id:'a',createdAt:'2026-10-18T01:00:00.000Z',environment:'production',status:'succeeded',stage:'deployed'};applyDeployments(d,{schemaVersion:4,checkedAt:now,rows:[r,r,{...r,id:'b',environment:'preview'},{...r,id:'c',stage:undefined}]});assert.equal(d.metrics.deployments.value,1);});
test('one server acquisition is shared across concurrent dashboard loads; failures isolate',async()=>{let count=0;const handler=createHandler(async()=>{count++;await new Promise(r=>setTimeout(r,5));throw Error('provider fails')});const snapshot=deriveJira(facts([issue()]));const env={ASSETS:{fetch:async req=>req.url.endsWith('buildometer-jira.json')?Response.json(snapshot):new Response('missing',{status:503})}};const responses=await Promise.all([handler(new Request('https://example.com/api/buildometer'),env),handler(new Request('https://example.com/api/buildometer'),env)]);const d=await responses[0].json();assert.equal(count,1);assert.equal(d.metrics.remaining.value,null);assert.equal(d.metrics.deployments.value,null);assert.notEqual(d.sources.jira.status,'live');assert.equal((await handler(new Request('https://example.com/api/buildometer?project=OTHER'),env)).status,400);});
test('adapter discovers field IDs, requests complete pages and strips people/bodies',async()=>{const paths=[];const json=v=>Response.json(v);const fetcher=async(url,options)=>{const path=new URL(url).pathname;paths.push(path);if(path.endsWith('/field'))return json([{id:'points-x',schema:{custom:'com.pyxis.greenhopper.jira:jsw-story-points'}},{id:'sprint-x',schema:{custom:'com.pyxis.greenhopper.jira:gh-sprint'}}]);if(path.endsWith('/statuses'))return json([{statuses:[{id:'open',statusCategory:{key:'new'}}]}]);if(path.endsWith('/search/jql')){const body=JSON.parse(options.body);assert.ok(body.fields.includes('points-x'));assert.ok(!body.fields.includes('assignee'));return json({issues:[{id:'1',key:'DEMO-1',fields:{issuetype:{name:'Story'},status:{id:'open',statusCategory:{key:'new'}},created:now,updated:now,labels:[]}}],isLast:true});}if(path.endsWith('/bulkfetch'))return json({issueChangeLogs:[]});throw Error('unexpected endpoint')};const f=await acquireJira({JIRA_BASE_URL:'https://example.atlassian.net',JIRA_PROJECT_KEY:'DEMO',JIRA_EMAIL:'test@example.test',JIRA_API_TOKEN:'test-only'},fetcher);assert.equal(f.issues[0].historyComplete,true);assert.equal(f.fields.points,'points-x');assert.ok(!JSON.stringify(deriveJira(f)).includes('DEMO-1'));assert.ok(paths.includes('/rest/api/3/changelog/bulkfetch'));});

const status=(at,from,to)=>({at,changes:[{field:'status',from,to}]});
const label=(at,fromString,toString)=>({at,changes:[{field:'labels',fromString,toString,from:null,to:null}]});
test('historical throughput retains completions for currently reopened work and counts only evidenced new cycles',()=>{
 const f=facts([issue({history:[
 status('2026-10-12T00:00:00.000Z','open','done'),status('2026-10-12T00:00:00.000Z','open','done'),
 status('2026-10-12T06:00:00.000Z','done','done'),status('2026-10-12T12:00:00.000Z','open','done'),
 status('2026-10-13T00:00:00.000Z','done','open'),status('2026-10-14T00:00:00.000Z','open','done'),
 status('2026-10-17T00:00:00.000Z','done','open')]})]);
 const d=deriveJira(f);assert.equal(d.metrics.done.value,0);assert.equal(d.metrics.throughput.value,2);
 assert.equal(d.series.throughput.reduce((n,p)=>n+p.value,0),2);assert.equal(d.supportingFacts.eventSummary.recompletions,1);assert.equal(d.supportingFacts.eventSummary.ignoredDuplicates,2);
});
test('throughput uses open-start closed-end buckets, not current Done dates',()=>{
 const d=deriveJira(facts([issue({key:'DEMO-1',status:'done',category:'done',history:[status('2026-10-11T12:00:00.000Z','open','done')]}),issue({key:'DEMO-2',status:'done',category:'done',history:[status(now,'open','done')]})]));
 assert.equal(d.metrics.throughput.value,1);assert.equal(d.series.throughput.reduce((n,p)=>n+p.value,0),2);
});
test('label removal does not erase bug membership or earlier resolved cycles after a reopen',()=>{
 const d=deriveJira(facts([issue({labels:[],status:'done',category:'done',history:[
 status('2026-10-12T00:00:00.000Z','open','done'),label('2026-10-13T00:00:00.000Z','bug',''),
 status('2026-10-14T00:00:00.000Z','done','open'),status('2026-10-16T00:00:00.000Z','open','done')]})]));
 assert.equal(d.supportingFacts.eventSummary.bugCohort,1);assert.equal(d.metrics.bugEliminated.value,2);assert.equal(d.metrics.reopens.value,1);assert.equal(d.metrics.bugDuration.value,48);
 assert.equal(d.supportingFacts.eventSummary.resolvedCycles,2);assert.equal(d.supportingFacts.eventSummary.resolvedBugItems,1);assert.match(d.metrics.bugDuration.unit,/n=2/);
});
test('Bug-to-Story type change retains a historically classified bug',()=>{
 const d=deriveJira(facts([issue({status:'done',category:'done',history:[status('2026-10-12T00:00:00.000Z','open','done'),{at:'2026-10-13T00:00:00.000Z',changes:[{field:'issuetype',from:'bug-type',to:'story-type',fromString:'Bug',toString:'Story'}]}]})]));
 assert.equal(d.supportingFacts.eventSummary.bugCohort,1);assert.equal(d.metrics.bugDuration.value,48);
});
test('classification while already Done does not fabricate elimination; an actual reopen starts the next cycle',()=>{
 const d=deriveJira(facts([issue({status:'done',category:'done',labels:['bug'],history:[label('2026-10-12T00:00:00.000Z','','bug'),status('2026-10-14T00:00:00.000Z','done','open'),status('2026-10-16T00:00:00.000Z','open','done')]})]));
 assert.equal(d.metrics.bugCreated.value,1);assert.equal(d.metrics.bugEliminated.value,1);assert.equal(d.metrics.reopens.value,1);assert.equal(d.metrics.bugDuration.value,48);assert.equal(d.supportingFacts.eventSummary.resolvedCycles,1);
});
test('relabeling does not create another classification; an open cycle is not a resolved sample',()=>{
 const d=deriveJira(facts([issue({labels:['bug'],history:[label('2026-10-12T00:00:00.000Z','','bug'),label('2026-10-13T00:00:00.000Z','bug',''),label('2026-10-14T00:00:00.000Z','','bug')]})]));
 assert.equal(d.metrics.bugCreated.value,1);assert.equal(d.metrics.bugHealth.value,1);assert.equal(d.supportingFacts.eventSummary.resolvedCycles,0);assert.equal(d.metrics.bugDuration.value,null);assert.equal(d.metrics.rework.value,null);
});
test('missing or unknown history remains unmeasured, never a fabricated zero or resolution-date event',()=>{
 const f=facts([issue({historyComplete:false})]);assert.equal(deriveJira(f).metrics.throughput.value,null);assert.equal(deriveJira(f).metrics.bugHealth.value,null);
 f.issues=[issue({status:'done',category:'done',resolved:now,history:[]})];assert.equal(deriveJira(f).metrics.throughput.value,0);
 f.issues=[issue({status:'done',category:'done',history:[status(now,'unknown-status','done')]})];assert.equal(deriveJira(f).metrics.throughput.value,null);
});

test('a currently reopened historical bug retains its closed sample and exposes the unfinished cycle',()=>{
 const d=deriveJira(facts([issue({labels:[],history:[status('2026-10-12T00:00:00.000Z','open','done'),status('2026-10-12T00:00:00.000Z','open','done'),label('2026-10-13T00:00:00.000Z','bug',''),status('2026-10-14T00:00:00.000Z','done','open')]})]));
 assert.equal(d.metrics.bugHealth.value,1);assert.equal(d.metrics.bugDuration.value,48);assert.equal(d.metrics.bugEliminated.value,1);assert.equal(d.supportingFacts.eventSummary.resolvedCycles,1);assert.equal(d.supportingFacts.eventSummary.openCycles,1);assert.equal(d.supportingFacts.eventSummary.ignoredDuplicates,1);
});
