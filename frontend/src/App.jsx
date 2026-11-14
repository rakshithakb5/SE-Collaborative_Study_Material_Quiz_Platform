import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

const API = import.meta.env.VITE_API_BASE_URL || '/api';
const readDemo = (key, fallback) => { try { const value = localStorage.getItem(`studyspace:${key}`); return value ? JSON.parse(value) : fallback; } catch { return fallback; } };
const saveDemo = (key, value) => { try { localStorage.setItem(`studyspace:${key}`, JSON.stringify(value)); } catch { /* private browsing / quota: current session still works */ } };
const fallbackMaterials = [
  { id:'mat-101', title:'Data Structures: Trees & Graphs', subject:'Computer Science', topic:'Data Structures', description:'Revision notes covering tree traversals, graph representations, BFS and DFS.', updatedAt:'2026-10-20', type:'Notes', readTime:'12 min' },
  { id:'mat-102', title:'SQL Joins and Subqueries', subject:'Database Systems', topic:'SQL', description:'Examples of joins, grouping, and nested queries.', updatedAt:'2026-10-18', type:'Cheat sheet', readTime:'8 min' },
  { id:'mat-103', title:'Software Engineering Sprint Guide', subject:'Software Engineering', topic:'Agile & Scrum', description:'A concise guide to sprint planning, stand-ups, reviews, and retrospectives.', updatedAt:'2026-10-15', type:'Guide', readTime:'10 min' },
  { id:'mat-104', title:'Computer Networks Essentials', subject:'Computer Networks', topic:'Networking', description:'OSI and TCP/IP models, protocols, and subnetting fundamentals.', updatedAt:'2026-10-12', type:'Notes', readTime:'15 min' },
  { id:'mat-105', title:'Operating Systems: Processes', subject:'Operating Systems', topic:'Processes', description:'Process states, scheduling, threads, and synchronization basics.', updatedAt:'2026-10-10', type:'Revision', readTime:'11 min' },
];
const fallbackQuizzes = [
 { id:'quiz-101', title:'Software Engineering Fundamentals', subject:'Software Engineering', difficulty:'Easy', duration:5, questionCount:3 },
 { id:'quiz-102', title:'Data Structures Quick Check', subject:'Data Structures', difficulty:'Medium', duration:4, questionCount:3 },
 { id:'quiz-103', title:'Database Basics', subject:'Database Systems', difficulty:'Easy', duration:4, questionCount:3 },
];
const fallbackQuizDetails = {
 'quiz-101': { ...fallbackQuizzes[0], questions:[
  {id:'q1',prompt:'What does SDLC stand for?',options:['Software Development Life Cycle','System Design and Logic Control','Structured Development Learning Course','Standard Data Link Connection'],answer:0,explanation:'SDLC means Software Development Life Cycle.'},
  {id:'q2',prompt:'Agile promotes iterative and incremental development.',options:['True','False'],answer:0,explanation:'Agile teams deliver work in short iterations and improve continuously.'},
  {id:'q3',prompt:'Which meeting is used to reflect on a sprint and identify improvements?',options:['Sprint review','Retrospective','Daily stand-up','Backlog grooming'],answer:1,explanation:'The retrospective focuses on how the team can improve its process.'}
 ]},
 'quiz-102': { ...fallbackQuizzes[1], questions:[
  {id:'q1',prompt:'What is the worst-case time complexity of binary search on a sorted array?',options:['O(1)','O(log n)','O(n)','O(n²)'],answer:1,explanation:'Binary search halves the remaining search interval each step.'},
  {id:'q2',prompt:'Which data structure follows LIFO?',options:['Queue','Stack','Graph','Heap'],answer:1,explanation:'A stack uses last-in, first-out ordering.'},
  {id:'q3',prompt:'BFS typically uses which data structure?',options:['Stack','Queue','Hash only','Recursion only'],answer:1,explanation:'A queue processes vertices in discovery order.'}
 ]},
 'quiz-103': { ...fallbackQuizzes[2], questions:[
  {id:'q1',prompt:'Which SQL clause filters groups after aggregation?',options:['WHERE','ORDER BY','HAVING','FROM'],answer:2,explanation:'HAVING filters grouped results after aggregation.'},
  {id:'q2',prompt:'A primary key uniquely identifies each row.',options:['True','False'],answer:0,explanation:'A primary key is unique and cannot be null.'},
  {id:'q3',prompt:'Which join returns only matching rows from both tables?',options:['LEFT JOIN','FULL JOIN','INNER JOIN','CROSS JOIN'],answer:2,explanation:'INNER JOIN returns rows with matching join conditions.'}
 ]}
};
const fallbackDashboard = {
 stats:[{label:'Study resources',value:5,note:'Ready to explore'},{label:'Practice quizzes',value:3,note:'Across 3 subjects'},{label:'Questions',value:9,note:'Quick knowledge checks'},{label:'Study streak',value:'4 days',note:'Keep it going'}],
 recentActivity:[{title:'Reviewed Data Structures',detail:'Trees and graph traversal',when:'Today'},{title:'Practised SQL queries',detail:'Joins and subqueries',when:'Yesterday'},{title:'Read Sprint Guide',detail:'Agile & Scrum',when:'2 days ago'}],
 checklist:[{id:'task-1',title:'Review data structures',detail:'Trees and graph traversal',tag:'Study'},{id:'task-2',title:'Practice SQL queries',detail:'Joins, grouping and subqueries',tag:'Practice'},{id:'task-3',title:'Review sprint concepts',detail:'Agile ceremonies and roles',tag:'Review'}]
};

function Icon({ name }) {
 const paths = {
  grid:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  book:<><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M4 5.5v14A2.5 2.5 0 0 1 6.5 17H20"/></>,
  check:<><path d="m5 12 4 4L19 6"/></>,
  search:<><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  arrow:<><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
  spark:<><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2z"/></>,
  bookopen:<><path d="M12 7v14"/><path d="M3 18V5a2 2 0 0 1 2-2h2a5 5 0 0 1 5 5 5 5 0 0 1 5-5h2a2 2 0 0 1 2 2v13"/><path d="M3 18h5a4 4 0 0 1 4 3 4 4 0 0 1 4-3h5"/></>,
 };
 return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.spark}</svg>;
}

function ThreadComment({ comment, level = 1, onReply }) {
 const [replyOpen,setReplyOpen]=useState(false);
 const [draft,setDraft]=useState('');
 return <article className="thread-comment" style={{marginLeft:`${(level-1)*18}px`}}>
  <div className="thread-comment-meta"><b>{comment.author}</b><small>{comment.createdAt}</small><span>Level {level}</span></div>
  <p>{comment.text}</p>
  {level<3 && <button type="button" className="text-action" onClick={()=>setReplyOpen(v=>!v)}>{replyOpen?'Cancel':'Reply'}</button>}
  {replyOpen && <form className="thread-reply-form" onSubmit={e=>{e.preventDefault();if(draft.trim()){onReply(comment.id,draft.trim());setDraft('');setReplyOpen(false);}}}><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Write a reply…"/><button className="secondary-btn" type="submit" disabled={!draft.trim()}>Reply</button></form>}
  {(comment.replies||[]).map(reply=><ThreadComment key={reply.id} comment={reply} level={level+1} onReply={onReply}/>)}
 </article>;
}

export default function App() {
 const [page,setPage] = useState('Dashboard');
 const [dashboard,setDashboard] = useState(fallbackDashboard);
 const [materials,setMaterials] = useState(fallbackMaterials);
 const [quizzes,setQuizzes] = useState(() => readDemo('quizzes', fallbackQuizzes));
 const [apiStatus,setApiStatus] = useState('connecting');
 const [search,setSearch] = useState('');
 const [subject,setSubject] = useState('All subjects');
 const [checked,setChecked] = useState([]);
 const [selectedQuiz,setSelectedQuiz] = useState(null);
 const [answers,setAnswers] = useState({});
 const [submitted,setSubmitted] = useState(false);
 const [secondsLeft,setSecondsLeft] = useState(0);
 const [quizStartedAt,setQuizStartedAt] = useState(null);
 const [leaderboard,setLeaderboard] = useState(() => readDemo('leaderboard', []));
 const [demoAttempts,setDemoAttempts] = useState(() => readDemo('attempts', []));
 const [adminUsers,setAdminUsers] = useState([]);
 const [adminMaterials,setAdminMaterials] = useState([]);
 const [adminReason,setAdminReason] = useState('Demo moderation action');
 const [quizBuilder,setQuizBuilder] = useState({title:'',subject:'Computer Science',duration:5,maxAttempts:1,group:'All students',question:'',options:'',answer:'0',explanation:''});
 const [notice,setNotice] = useState('');
 const [authOpen,setAuthOpen] = useState(false);
 const [authMode,setAuthMode] = useState('login');
 const [authForm,setAuthForm] = useState({email:'',password:'',role:'student'});
 const [currentUser,setCurrentUser] = useState(null);
 const [authError,setAuthError] = useState('');
 const [authBusy,setAuthBusy] = useState(false);
 const [selectedMaterial,setSelectedMaterial] = useState(null);
 const [materialVersions,setMaterialVersions] = useState([]);
 const [versionDraft,setVersionDraft] = useState('');
 const [versionBusy,setVersionBusy] = useState(false);
 const [materialUploadOpen,setMaterialUploadOpen] = useState(false);
 const [uploadForm,setUploadForm] = useState({title:'',subject:'Computer Science',topic:'',description:'',content:''});
 const [userMaterials,setUserMaterials] = useState(() => readDemo('materials', []));
 const [materialComments,setMaterialComments] = useState(() => readDemo('comments', {}));
 const [commentDraft,setCommentDraft] = useState('');
 const [scheduledItems,setScheduledItems] = useState(()=>readDemo('scheduledItems',[]));
 const [scheduleForm,setScheduleForm] = useState({group:'',members:'',quiz:'',start:'',end:''});
 const [ratings,setRatings] = useState(() => readDemo('ratings', {}));
 const [notifications,setNotifications] = useState(() => readDemo('notifications', [
  {id:'n1',title:'Welcome to StudySpace',detail:'Explore resources and complete a practice quiz.',read:false},
  {id:'n2',title:'Study reminder',detail:'Review one topic before your next study session.',read:false}
 ]));

 useEffect(() => {
  let active = true;
  async function load() {
   try {
    const [health,d,m,q] = await Promise.all([
     fetch(`${API}/health`), fetch(`${API}/demo/dashboard`), fetch(`${API}/demo/materials`), fetch(`${API}/demo/quizzes`)
    ]);
    if (!health.ok || !d.ok || !m.ok || !q.ok) throw new Error('API response not OK');
    const [dashboardData,materialData,quizData] = await Promise.all([d.json(),m.json(),q.json()]);
    if (!active) return;
    setDashboard(dashboardData); setMaterials(materialData.materials || fallbackMaterials); setQuizzes(old=>[...old.filter(q=>String(q.id).startsWith('local-')), ...(quizData.quizzes || fallbackQuizzes)]); setApiStatus('connected');
   } catch {
    if (active) setApiStatus('offline');
   }
  }
  load();
  return () => { active = false; };
 }, []);

 useEffect(() => { saveDemo('materials', userMaterials); }, [userMaterials]);
 useEffect(() => { saveDemo('comments', materialComments); }, [materialComments]);
 useEffect(() => { saveDemo('scheduledItems', scheduledItems); }, [scheduledItems]);
 useEffect(() => { saveDemo('ratings', ratings); }, [ratings]);
 useEffect(() => { saveDemo('notifications', notifications); }, [notifications]);
 useEffect(() => { saveDemo('quizzes', quizzes); }, [quizzes]);
 useEffect(() => { saveDemo('attempts', demoAttempts); }, [demoAttempts]);
 useEffect(() => { saveDemo('leaderboard', leaderboard); }, [leaderboard]);

 const allMaterials = [...materials, ...userMaterials];
 const filteredMaterials = useMemo(() => allMaterials.filter(m => {
  const term = search.toLowerCase();
  return (!term || `${m.title} ${m.topic} ${m.description} ${m.subject}`.toLowerCase().includes(term))
   && (subject === 'All subjects' || m.subject === subject);
 }),[materials,userMaterials,search,subject]);
 const subjects = ['All subjects',...new Set(allMaterials.map(m=>m.subject))];
 const go = (target) => { setPage(target); setNotice(''); window.scrollTo({top:0,behavior:'smooth'}); };
 const openQuiz = async (quiz) => {
  const used=demoAttempts.filter(a=>a.quizId===quiz.id).length; if(used >= (quiz.maxAttempts||Infinity)){setNotice('Maximum demo attempts reached for this quiz.');return;}
  setSelectedQuiz(quiz); setAnswers({}); setSubmitted(false); setSecondsLeft((quiz.duration || 5)*60); setQuizStartedAt(Date.now()); setNotice('');
  try {
   const r = await fetch(`${API}/demo/quizzes/${quiz.id}`);
   if (r.ok) { const data = await r.json(); setSelectedQuiz(data.quiz); }
   else setSelectedQuiz(fallbackQuizDetails[quiz.id] || quiz);
  } catch { setSelectedQuiz(fallbackQuizDetails[quiz.id] || quiz); }
 };
 const score = selectedQuiz?.questions?.reduce((sum,q,i)=>sum+(answers[i]===q.answer?1:0),0) || 0;
 const recordDemoAttempt = () => { if (!selectedQuiz) return; const total=selectedQuiz.questions?.length||0; const item={id:`attempt-${Date.now()}`,quizId:selectedQuiz.id,quizTitle:selectedQuiz.title,name:currentUser?.email||'Demo student',score,total,percent:total?Math.round(score/total*100):0,completedAt:new Date().toISOString()}; setDemoAttempts(old=>[item,...old]); setLeaderboard(old=>[...old,item].sort((a,b)=>b.percent-a.percent).map((x,i)=>({...x,rank:i+1}))); setNotifications(old=>[{id:`result-${Date.now()}`,title:'Quiz result available',detail:`You scored ${score}/${total} in ${selectedQuiz.title}.`,read:false},...old]); };
 useEffect(()=>{ if(!selectedQuiz || submitted || secondsLeft<=0) return; const id=setInterval(()=>setSecondsLeft(v=>Math.max(0,v-1)),1000); return ()=>clearInterval(id); },[selectedQuiz,submitted,secondsLeft>0]);
 useEffect(()=>{ if(selectedQuiz && !submitted && secondsLeft===0 && quizStartedAt){setSubmitted(true);recordDemoAttempt();} },[secondsLeft,selectedQuiz,submitted,quizStartedAt]);
 const apiCall = async (path, options={}) => { const token=sessionStorage.getItem('csq_token'); const r=await fetch(`${API}${path}`,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} : {}),...(options.headers||{})}}); const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||`Request failed (${r.status})`); return d; };
 const loadMaterialVersions = async (material) => {
  if (!material) return;
  const localVersions = readDemo('materialVersions', {});
  const token = (()=>{try{return sessionStorage.getItem('csq_token')}catch{return null}})();
  if (token && !currentUser?.demo && !String(material.id).startsWith('mat-')) {
   try { const data = await apiCall(`/materials/${encodeURIComponent(material.id)}/versions`); setMaterialVersions(data.versions || []); return; }
   catch (error) { setNotice(`Could not load server version history: ${error.message}`); }
  }
  const versions = localVersions[material.id] || material.versions || [{version:1,content:material.content || material.description || '',updatedAt:material.updatedAt || new Date().toISOString()}];
  setMaterialVersions(versions);
 };
 const addMaterialVersion = async (event) => {
  event.preventDefault(); if (!selectedMaterial || !versionDraft.trim()) return; setVersionBusy(true);
  try {
   const token = (()=>{try{return sessionStorage.getItem('csq_token')}catch{return null}})();
   if (token && !currentUser?.demo && !String(selectedMaterial.id).startsWith('mat-')) {
    const data = await apiCall(`/materials/${encodeURIComponent(selectedMaterial.id)}/versions`, {method:'POST',body:JSON.stringify({content:versionDraft.trim()})});
    await loadMaterialVersions(selectedMaterial); setNotice(`Version ${data.version?.version || 'new'} saved to the server.`);
   } else {
    const store = readDemo('materialVersions', {}); const old = store[selectedMaterial.id] || materialVersions;
    const next = [...old,{version:old.length+1,content:versionDraft.trim(),updatedAt:new Date().toISOString()}];
    store[selectedMaterial.id]=next; saveDemo('materialVersions',store); setMaterialVersions(next); setNotice(`Version ${next.length} saved in this browser demo only.`);
   }
   setVersionDraft('');
  } catch(error) { setNotice(`Could not save version: ${error.message}`); } finally { setVersionBusy(false); }
 };
 const downloadMaterialVersion = async (version) => {
  if (!selectedMaterial) return;
  const token = (()=>{try{return sessionStorage.getItem('csq_token')}catch{return null}})();
  if (token && !currentUser?.demo && !String(selectedMaterial.id).startsWith('mat-')) {
   try { const response=await fetch(`${API}/materials/${encodeURIComponent(selectedMaterial.id)}/versions/${version.version}/download`,{headers:{Authorization:`Bearer ${token}`}}); if(!response.ok) throw new Error(`Download failed (${response.status})`); const blob=await response.blob(); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`${selectedMaterial.title.replace(/[^a-z0-9]+/gi,'-')}-v${version.version}.txt`; a.click(); URL.revokeObjectURL(url); return; } catch(e) { setNotice(e.message); return; }
  }
  const blob=new Blob([version.content || ''],{type:'text/plain;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`${selectedMaterial.title.replace(/[^a-z0-9]+/gi,'-')}-v${version.version}.txt`; a.click(); URL.revokeObjectURL(url);
 };
 const loadAdminData = async () => { try { const [u,m]=await Promise.all([apiCall('/admin/users'),apiCall('/admin/materials/review-queue')]); setAdminUsers(u.users||[]); setAdminMaterials(m.items||[]); } catch(e) { if(currentUser?.demo && currentUser.role==='admin'){setAdminUsers(readDemo('adminUsers',[{id:'demo-student-1',email:'student@studyspace.demo',role:'student',status:'active'},{id:'demo-instructor-1',email:'instructor@studyspace.demo',role:'instructor',status:'active'}]));setAdminMaterials(readDemo('reviewQueue',[]));setNotice('Showing local demo administration data. No real accounts or content were changed.');} else setNotice(`Admin data could not load: ${e.message}. Sign in with an admin account.`); } };
 const submitQuizBuilder = async (event) => {
  event.preventDefault();
  const options = quizBuilder.options.split('\n').map(x=>x.trim()).filter(Boolean);
  const answerIndex = Number(quizBuilder.answer);
  if (options.length < 2 || answerIndex < 0 || answerIndex >= options.length) { setNotice('Add at least two options and choose a valid correct option index.'); return; }
  const localQuiz = { id:`local-quiz-${Date.now()}`, title:quizBuilder.title.trim(), subject:quizBuilder.subject, difficulty:'Medium', duration:Number(quizBuilder.duration)||5, questionCount:1, maxAttempts:Number(quizBuilder.maxAttempts)||1, group:quizBuilder.group, published:true, questions:[{id:'q1',prompt:quizBuilder.question,options,answer:answerIndex,explanation:quizBuilder.explanation||'Review the correct answer and the related study material.'}] };
  try {
   const payload={title:localQuiz.title,subject:localQuiz.subject,status:'published',settings:{timeLimitSeconds:localQuiz.duration*60,maxAttempts:localQuiz.maxAttempts,shuffle:false,difficulty:'medium'},questions:[{id:'q1',type:'mcq',prompt:localQuiz.questions[0].prompt,options,correctAnswer:answerIndex,points:1}]};
   const data=await apiCall('/quizzes',{method:'POST',body:JSON.stringify(payload)});
   const apiQuiz=data.quiz;
   const adapted={...localQuiz,id:apiQuiz.id, duration:Math.ceil((apiQuiz.timeLimitSeconds||300)/60), questions:apiQuiz.questions?.map(q=>({...q,answer:q.correctAnswer}))||localQuiz.questions};
   setQuizzes(old=>[adapted,...old.filter(q=>q.id!==adapted.id)]); setNotice(`Quiz published through the API (${adapted.id}).`);
  } catch(e) {
   setQuizzes(old=>[localQuiz,...old.filter(q=>q.id!==localQuiz.id)]);
   setNotice(`API unavailable (${e.message}). Quiz created in this browser demo and saved locally; backend publication is not verified.`);
  }
  setQuizBuilder({title:'',subject:'Computer Science',duration:5,maxAttempts:1,group:'All students',question:'',options:'',answer:'0',explanation:''});
 };
 const submitAuth = async (event) => {
  event.preventDefault(); setAuthError(''); setAuthBusy(true);
  const endpoint = authMode === 'register' ? 'register' : 'login';
  try {
   const response = await fetch(`${API}/auth/${endpoint}`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify(authMode==='register' ? authForm : {email:authForm.email,password:authForm.password})
   });
   const data = await response.json().catch(()=>({}));
   if (!response.ok) throw new Error(data.error || 'Authentication failed');
   if (authMode==='register') {
    setAuthError(data.verificationEmailSent ? 'Account created. Verification message sent by the configured notifier. Please sign in.' : 'Account created. Please sign in.');
    setAuthMode('login');
   } else {
    try { sessionStorage.setItem('csq_token',data.token); } catch {}
    setCurrentUser(data.user); setAuthOpen(false); setNotice(`Signed in as ${data.user.email} (${data.user.role}).`);
   }
  } catch (error) { setAuthError(error.message || 'Cannot reach the API. Start the backend and try again.'); }
  finally { setAuthBusy(false); }
 };
 const enterDemoRole = (role) => {
  const user={id:`demo-${role}`,email:`${role}@studyspace.demo`,role,status:'active',demo:true};
  setCurrentUser(user); setAuthOpen(false); setNotice(`Demo session started as ${role}. Changes are saved in this browser only.`);
  if (role==='admin') { setAdminUsers(readDemo('adminUsers',[{id:'demo-student-1',email:'student@studyspace.demo',role:'student',status:'active'},{id:'demo-instructor-1',email:'instructor@studyspace.demo',role:'instructor',status:'active'}])); }
 };
 const exportInstructorCsv = () => {
  const rows=[['Quiz','Subject','Attempts','Average score']];
  quizzes.forEach(q=>{const entries=demoAttempts.filter(a=>a.quizId===q.id);const avg=entries.length?Math.round(entries.reduce((n,a)=>n+a.percent,0)/entries.length):0;rows.push([q.title,q.subject,entries.length,`${avg}%`]);});
  const csv=rows.map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='studyspace-instructor-analytics.csv';a.click();URL.revokeObjectURL(url);
 };
 const uploadMaterial = async (event) => {
  event.preventDefault();
  if (!uploadForm.title.trim() || !uploadForm.content.trim()) { setNotice('Add a title and material content before publishing.'); return; }
  const token = (()=>{try{return sessionStorage.getItem('csq_token')}catch{return null}})();
  if (token && ['instructor','admin'].includes(currentUser?.role)) {
   try {
    const response = await fetch(`${API}/materials`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({title:uploadForm.title,content:uploadForm.content})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.error||'Upload failed');
    setNotice(`Material submitted. Plagiarism screening status: ${data.status}.`); setNotifications(old=>[{id:`material-${Date.now()}`,title:'Material submitted',detail:`${uploadForm.title} screening status: ${data.status}.`,read:false},...old]);
   } catch(error) { setNotice(`Upload failed: ${error.message}`); return; }
  } else {
   const item={id:`local-${Date.now()}`,...uploadForm,type:'Shared notes',readTime:`${Math.max(1,Math.ceil(uploadForm.content.split(/\\s+/).length/180))} min`,updatedAt:new Date().toISOString().slice(0,10),status:'local-demo',versions:[{version:1,content:uploadForm.content}]};
   setUserMaterials(old=>[item,...old]); setNotice('Material added to this browser demo. It is saved in this browser only.'); setNotifications(old=>[{id:`material-${Date.now()}`,title:'New study material added',detail:`${uploadForm.title} is now in your local study library.`,read:false},...old]);
  }
  setMaterials(old=>old); setMaterialUploadOpen(false); setUploadForm({title:'',subject:'Computer Science',topic:'',description:'',content:''});
 };
 const downloadMaterial = (material) => {
  const content = material.content || material.versions?.[0]?.content || `${material.title}\n\n${material.description || ''}\n\nSample study resource for the StudySpace demo.`;
  const blob = new Blob([content],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob); const anchor=document.createElement('a');
  anchor.href=url; anchor.download=`${(material.title||'study-material').replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.txt`;
  document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
 };
 const addComment = () => {
  if(!commentDraft.trim() || !selectedMaterial) return;
  setMaterialComments(old=>({...old,[selectedMaterial.id]:[...(old[selectedMaterial.id]||[]),{id:`c-${Date.now()}`,text:commentDraft.trim(),author:currentUser?.email||'Demo student',createdAt:new Date().toLocaleString(),replies:[]}]}));
  setCommentDraft('');
 };
 const addThreadReply = (parentId,text) => {
  if(!selectedMaterial) return;
  const addToTree=nodes=>nodes.map(node=>node.id===parentId
   ? {...node,replies:[...(node.replies||[]),{id:`r-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,text,author:currentUser?.email||'Demo student',createdAt:new Date().toLocaleString(),replies:[]}]}
   : {...node,replies:addToTree(node.replies||[])});
  setMaterialComments(old=>({...old,[selectedMaterial.id]:addToTree(old[selectedMaterial.id]||[])}));
 };
 const createSchedule = event => {
  event.preventDefault();
  const start=new Date(scheduleForm.start),end=new Date(scheduleForm.end);
  if(!scheduleForm.group.trim()||!scheduleForm.quiz.trim()||!scheduleForm.start||!scheduleForm.end||Number.isNaN(+start)||Number.isNaN(+end)||end<=start){setNotice('Enter a group, quiz, valid start and end time. End must be after start.');return;}
  const item={id:`schedule-${Date.now()}`,group:scheduleForm.group.trim(),members:scheduleForm.members.split(/[\n,;]/).map(x=>x.trim()).filter(Boolean),quiz:scheduleForm.quiz.trim(),start:scheduleForm.start,end:scheduleForm.end};
  setScheduledItems(old=>[item,...old]);setScheduleForm({group:'',members:'',quiz:'',start:'',end:''});setNotice('Group quiz schedule created and saved in this browser demo.');
 };
 const demoAdminAction = (userId, action) => { const users=adminUsers.map(u=>u.id===userId?{...u,status:action==='suspend'?'suspended':'active'}:u);setAdminUsers(users);saveDemo('adminUsers',users);setNotice(`Demo action recorded: ${action} for ${userId}. This does not affect a real account.`); };
 const nav = [{name:'Dashboard',icon:'grid'},{name:'Study Library',icon:'book'},{name:'Quiz Center',icon:'check'},{name:'Leaderboard',icon:'spark'},{name:'Notifications',icon:'spark'},...(['instructor','admin'].includes(currentUser?.role)?[{name:'Instructor',icon:'bookopen'}]:[]),...(currentUser?.role==='admin'?[{name:'Administration',icon:'grid'}]:[])];

 return <div className="app-shell">
  <aside className="sidebar">
   <button className="brand" onClick={()=>go('Dashboard')} ><span className="brand-mark">S</span><span><b>StudySpace</b><small>Collaborative Learning</small></span></button>
   <div className="nav-label">WORKSPACE</div>
   <nav>{nav.map(item=><button key={item.name} className={`nav-item ${page===item.name?'active':''}`} onClick={()=>go(item.name)}><Icon name={item.icon}/><span>{item.name}</span></button>)}</nav>
   <div className="sidebar-bottom"><div className="avatar">{(currentUser?.role||'S').slice(0,1).toUpperCase()}</div><div><b>{currentUser ? `${currentUser.role} workspace` : 'Student workspace'}</b><small>{currentUser?.email || 'Collaborative Study Platform'}</small><span className={`api-state ${apiStatus}`}>{apiStatus==='connected'?'API connected':apiStatus==='offline'?'Demo mode · API offline':'Connecting API…'}</span></div></div>
  </aside>
  <main className="main-area">
   <header className="topbar"><div><p className="eyebrow">LEARNING WORKSPACE</p><h1>{page}</h1></div><button className="primary-btn" onClick={()=>{if(currentUser){setCurrentUser(null);sessionStorage.removeItem('csq_token');setNotice('Signed out.');return;}setAuthError('');setAuthOpen(true)}}>{currentUser ? `${currentUser.email} · Sign out` : 'Sign in / Register'}</button></header>
   {notice && <div className="notice" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss">×</button></div>}
   {page==='Dashboard' && <div className="content">
    <section className="hero"><div className="hero-copy"><p className="eyebrow light">YOUR LEARNING OVERVIEW</p><h2>Make today count.</h2><p>Keep your study resources organized and make progress one session at a time.</p><button className="hero-btn" onClick={()=>go('Study Library')}>Explore study library <Icon name="arrow"/></button></div><div className="hero-spark">✦</div></section>
    <section className="section-heading"><div><h2>Your workspace</h2><p>Quick access to your study tools.</p></div></section>
    <div className="stats-grid">{dashboard.stats.map((s,i)=><article className="stat-card" key={s.label}><div className={`stat-icon tone-${i}`}><Icon name={['book','check','spark','clock'][i]}/></div><span>{s.label}</span><strong>{s.value}</strong><small>{s.note}</small></article>)}</div>
    <section className="checklist-card"><div className="card-heading"><div><h2>Suggested study checklist</h2><p>Personal checklist for this session. It is stored in this page's state only.</p></div><b className="progress-count">{checked.length}/{dashboard.checklist.length}</b></div><div className="checklist">{dashboard.checklist.map(t=><label className={`task-row ${checked.includes(t.id)?'done':''}`} key={t.id}><input type="checkbox" checked={checked.includes(t.id)} onChange={()=>setChecked(old=>old.includes(t.id)?old.filter(x=>x!==t.id):[...old,t.id])}/><span className="task-text"><b>{t.title}</b><small>{t.detail}</small></span><span className="tag">{t.tag}</span></label>)}</div></section>
    <section className="activity-card"><div className="section-heading"><div><h2>Recent activity</h2><p>A little progress adds up.</p></div></div>{dashboard.recentActivity.map((a,i)=><div className="activity-row" key={a.title}><span className="activity-dot">{i+1}</span><div><b>{a.title}</b><small>{a.detail}</small></div><time>{a.when}</time></div>)}</section>
   </div>}
   {page==='Study Library' && <div className="content">
    <section className="page-intro"><div><h2>Your study resources</h2><p>Browse, search, and revisit your learning materials.</p></div><span className="result-count">{filteredMaterials.length} resources</span></section>
    <div className="filter-bar"><label className="search-box"><Icon name="search"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search materials or topics..." aria-label="Search materials"/></label><select value={subject} onChange={e=>setSubject(e.target.value)} aria-label="Filter by subject">{subjects.map(s=><option key={s}>{s}</option>)}</select></div>
    <div className="library-actions"><p>Open a resource to read its content, download a text copy, rate it, or join the discussion.</p><button className="primary-btn" onClick={()=>setMaterialUploadOpen(true)}>＋ Add material</button></div>
    {filteredMaterials.length ? <div className="materials-grid">{filteredMaterials.map((m,i)=><article className="material-card" key={m.id}><div className={`material-icon tone-${i%4}`}><Icon name="bookopen"/></div><div className="material-meta"><span>{m.subject}</span><span>{m.type}</span></div><h3>{m.title}</h3><p>{m.description}</p><div className="material-footer"><span><Icon name="clock"/> {m.readTime || '10 min read'}</span><button onClick={()=>{setSelectedMaterial(m);setCommentDraft('');loadMaterialVersions(m)}}>View resource <Icon name="arrow"/></button></div></article>)}</div> : <div className="empty-state"><Icon name="search"/><h3>No resources found</h3><p>Try another search term or choose a different subject.</p></div>}
   </div>}
   {page==='Quiz Center' && <div className="content">
    {!selectedQuiz ? <>
     <section className="page-intro"><div><h2>Test your knowledge</h2><p>Short practice quizzes with instant feedback and explanations.</p></div><span className="result-count">{quizzes.length} quizzes</span></section>
     <div className="quiz-grid">{quizzes.map((q,i)=><article className="quiz-card" key={q.id}><div className={`quiz-symbol tone-${i%4}`}><Icon name="check"/></div><span className="pill">{q.difficulty || 'Practice'}</span><h3>{q.title}</h3><p>{q.subject}</p><div className="quiz-info"><span><Icon name="book"/> {q.questionCount || q.questions?.length || 3} questions</span><span><Icon name="clock"/> {q.duration || 5} min</span></div><button className="wide-btn" onClick={()=>openQuiz(q)}>Start quiz <Icon name="arrow"/></button></article>)}</div>
    </> : <section className="quiz-runner"><button className="back-link" onClick={()=>{setSelectedQuiz(null);setAnswers({});setSubmitted(false)}}>← Back to quizzes</button><div className="quiz-runner-heading"><div><p className="eyebrow">KNOWLEDGE CHECK</p><h2>{selectedQuiz.title}</h2><p>{selectedQuiz.subject}</p></div><span className="result-count">{selectedQuiz.questions?.length || 0} questions</span><span className={`timer-pill ${secondsLeft<30?'urgent':''}`} aria-live="polite">⏱ {Math.floor(secondsLeft/60).toString().padStart(2,'0')}:{(secondsLeft%60).toString().padStart(2,'0')} remaining</span></div>
      {(selectedQuiz.questions || []).map((q,i)=><article className="question-card" key={q.id}><span className="question-number">QUESTION {i+1}</span><h3>{q.prompt}</h3><div className="answer-list">{q.options.map((opt,j)=><label key={j} className={`answer-option ${answers[i]===j?'chosen':''} ${submitted&&j===q.answer?'correct':''} ${submitted&&answers[i]===j&&j!==q.answer?'incorrect':''}`}><input type="radio" name={`question-${i}`} checked={answers[i]===j} disabled={submitted} onChange={()=>setAnswers(old=>({...old,[i]:j}))}/><span>{opt}</span>{submitted&&j===q.answer&&<b>Correct answer</b>}</label>)}</div>{submitted&&<p className="explanation">{q.explanation}</p>}</article>)}
      {!submitted ? <button className="primary-btn submit-quiz" onClick={()=>{setSubmitted(true);recordDemoAttempt();}}>Submit answers</button> : <div className="score-panel"><div><p className="eyebrow">YOUR RESULT</p><h2>{score} / {selectedQuiz.questions.length} correct</h2><p>{score===selectedQuiz.questions.length?'Excellent work!':score>0?'Good effort — review the explanations and try again.':'Keep practising; you will improve.'} {secondsLeft===0?'The timer ended.':''}</p><p className="muted-copy">Correct answers and explanations are revealed below after submission.</p></div><button className="primary-btn" onClick={()=>{setAnswers({});setSubmitted(false);setSecondsLeft((selectedQuiz.duration||5)*60);setQuizStartedAt(Date.now())}}>Try again</button></div>}
     </section>}
   </div>}
   {page==='Leaderboard' && <div className="content"><section className="page-intro"><div><h2>Quiz leaderboard</h2><p>Demo rankings for completed practice quizzes. Authenticated attempts should be persisted by the quiz API.</p></div><button className="secondary-btn" onClick={async()=>{try{const d=await apiCall('/quizzes/quiz-101/leaderboard');setLeaderboard(d.entries||d.leaderboard||[])}catch(e){setNotice(`Leaderboard API unavailable: ${e.message}. Showing sample demo rankings.`);setLeaderboard([{rank:1,name:'Aarav',score:3,total:3},{rank:2,name:'Demo student',score:2,total:3},{rank:3,name:'Diya',score:2,total:3}])}}}>Refresh leaderboard</button></section><div className="table-wrap"><table className="data-table"><thead><tr><th>Rank</th><th>Student</th><th>Score</th></tr></thead><tbody>{(leaderboard.length?leaderboard.map((x,i)=>({...x,rank:x.rank||i+1,name:x.name||x.email||'Demo student'})):[{rank:1,name:'Aarav',score:3,total:3},{rank:2,name:'Demo student',score:2,total:3},{rank:3,name:'Diya',score:2,total:3}]).map((x,i)=><tr key={`${x.rank}-${x.name}`}><td>#{x.rank||i+1}</td><td>{x.name||x.email||'Student'}</td><td>{x.score}/{x.total||3}</td></tr>)}</tbody></table></div></div>}
   {page==='Instructor' && <div className="content"><section className="page-intro"><div><h2>Instructor workspace</h2><p>Create and publish quizzes, review local demo performance, and export a CSV summary.</p></div><button className="secondary-btn" onClick={exportInstructorCsv}>Export analytics CSV</button></section><section className="checklist-card"><h2>Create a quiz</h2><form className="stacked-form" onSubmit={submitQuizBuilder}><label>Quiz title<input required value={quizBuilder.title} onChange={e=>setQuizBuilder({...quizBuilder,title:e.target.value})}/></label><label>Subject<input value={quizBuilder.subject} onChange={e=>setQuizBuilder({...quizBuilder,subject:e.target.value})}/></label><div className="two-fields"><label>Time limit (minutes)<input type="number" min="1" value={quizBuilder.duration} onChange={e=>setQuizBuilder({...quizBuilder,duration:e.target.value})}/></label><label>Maximum attempts<input type="number" min="1" value={quizBuilder.maxAttempts} onChange={e=>setQuizBuilder({...quizBuilder,maxAttempts:e.target.value})}/></label></div><label>Target group<input value={quizBuilder.group} onChange={e=>setQuizBuilder({...quizBuilder,group:e.target.value})}/></label><label>Question<input required value={quizBuilder.question} onChange={e=>setQuizBuilder({...quizBuilder,question:e.target.value})}/></label><label>Answer options (one per line)<textarea required rows="4" value={quizBuilder.options} onChange={e=>setQuizBuilder({...quizBuilder,options:e.target.value})}/></label><label>Correct option index (starts at 0)<input type="number" min="0" value={quizBuilder.answer} onChange={e=>setQuizBuilder({...quizBuilder,answer:e.target.value})}/></label><label>Explanation<input value={quizBuilder.explanation} onChange={e=>setQuizBuilder({...quizBuilder,explanation:e.target.value})}/></label><button className="primary-btn" type="submit">Create quiz</button></form><p className="muted-copy">Demo-created quizzes are stored in this browser. The API path is used when available.</p></section><section className="checklist-card schedule-card"><h2>Group scheduling</h2><p className="muted-copy">Schedule a quiz for a study group. Demo schedules are saved in this browser.</p><form className="stacked-form" onSubmit={createSchedule}><label>Group name<input required value={scheduleForm.group} onChange={e=>setScheduleForm({...scheduleForm,group:e.target.value})} placeholder="DBMS Study Group"/></label><label>Student emails (comma or newline separated)<textarea rows="2" value={scheduleForm.members} onChange={e=>setScheduleForm({...scheduleForm,members:e.target.value})} placeholder="student1@example.com, student2@example.com"/></label><label>Quiz title<input required value={scheduleForm.quiz} onChange={e=>setScheduleForm({...scheduleForm,quiz:e.target.value})} placeholder="DBMS Unit 2 Quiz"/></label><div className="two-fields"><label>Start date &amp; time<input required type="datetime-local" value={scheduleForm.start} onChange={e=>setScheduleForm({...scheduleForm,start:e.target.value})}/></label><label>End date &amp; time<input required type="datetime-local" value={scheduleForm.end} onChange={e=>setScheduleForm({...scheduleForm,end:e.target.value})}/></label></div><button className="primary-btn" type="submit">Schedule group quiz</button></form><div className="schedule-list"><h3>Scheduled group quizzes</h3>{scheduledItems.length?scheduledItems.map(item=><article className="schedule-row" key={item.id}><div><b>{item.quiz}</b><p>{item.group} · {item.members.length} listed student(s)</p><small>{new Date(item.start).toLocaleString()} – {new Date(item.end).toLocaleString()}</small></div><button type="button" className="secondary-btn" onClick={()=>setScheduledItems(old=>old.filter(x=>x.id!==item.id))}>Remove</button></article>):<p className="muted-copy">No group quizzes scheduled yet.</p>}</div></section></div>}
   {page==='Administration' && <div className="content"><section className="page-intro"><div><h2>Administration & moderation</h2><p>Suspend/reactivate users and review material screening status. Admin APIs require an admin JWT.</p></div><button className="primary-btn" onClick={loadAdminData}>Load admin data</button></section><section className="checklist-card"><h2>User management</h2>{adminUsers.length===0?<p className="muted-copy">Select “Load admin data” to fetch users from the protected API.</p>:<div className="table-wrap"><table className="data-table"><thead><tr><th>User</th><th>Role / status</th><th>Actions</th></tr></thead><tbody>{adminUsers.map(u=><tr key={u.id}><td>{u.email}</td><td>{u.role} / {u.status}</td><td><button className="secondary-btn" onClick={async()=>{if(currentUser?.demo){demoAdminAction(u.id,u.status==='suspended'?'reactivate':'suspend');return;}try{await apiCall(`/admin/users/${u.id}/${u.status==='suspended'?'reactivate':'suspend'}`,{method:'POST',body:JSON.stringify({reason:adminReason})});loadAdminData()}catch(e){setNotice(e.message)}}}>{u.status==='suspended'?'Reactivate':'Suspend'}</button> <button className="secondary-btn" onClick={async()=>{if(currentUser?.demo){setNotice(`Demo warning recorded for ${u.email}: ${adminReason}`);return;}try{await apiCall(`/admin/users/${u.id}/warn`,{method:'POST',body:JSON.stringify({reason:adminReason})});setNotice(`Warning sent to ${u.email}`)}catch(e){setNotice(e.message)}}}>Warn</button></td></tr>)}</tbody></table></div>}<label>Audit reason for moderation actions<input value={adminReason} onChange={e=>setAdminReason(e.target.value)}/></label></section><section className="checklist-card"><h2>Moderation queue</h2>{adminMaterials.length===0?<p className="muted-copy">No material queue loaded. Pending / flagged items are returned by the material API when available.</p>:adminMaterials.map(m=><div className="activity-row" key={m.id}><div><b>{m.title}</b><small>Status: {m.status}</small></div><span>{m.scan?.similarity!==undefined?`${Math.round(m.scan.similarity*100)}% similarity`:''}</span></div>)}</section></div>}
   {page==='Notifications' && <div className="content"><section className="page-intro"><div><h2>Notifications</h2><p>In-app updates for study activity, results and reminders.</p></div><button className="secondary-btn" onClick={()=>setNotifications(old=>old.map(n=>({...n,read:true})))}>Mark all read</button></section><div className="notification-list">{notifications.map(n=><article className={`notification-item ${n.read?'read':''}`} key={n.id}><span className="notification-dot"/><div><b>{n.title}</b><p>{n.detail}</p></div><button onClick={()=>setNotifications(old=>old.map(x=>x.id===n.id?{...x,read:true}:x))}>{n.read?'Read':'Mark read'}</button></article>)}</div></div>}
   {selectedMaterial && <div className="modal-backdrop" role="presentation" onClick={()=>setSelectedMaterial(null)}><section className="modal-card material-detail-modal" role="dialog" aria-modal="true" aria-labelledby="material-modal-title" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setSelectedMaterial(null)} aria-label="Close">×</button><p className="eyebrow">STUDY RESOURCE · {selectedMaterial.subject}</p><h2 id="material-modal-title">{selectedMaterial.title}</h2><p>{selectedMaterial.description}</p><div className="resource-content">{selectedMaterial.content || selectedMaterial.versions?.[0]?.content || `Study notes: ${selectedMaterial.title}\n\n${selectedMaterial.description}\n\nKey points\n• Review the core definitions and concepts.\n• Work through examples and explain each step.\n• Test your understanding with practice questions.\n\nThis is sample demo content; upload your own material to include its actual text.`}</div><div className="resource-actions"><button className="primary-btn" onClick={()=>downloadMaterial(selectedMaterial)}>Download resource</button><label className="rating-control">Rate material <select value={ratings[selectedMaterial.id]||''} onChange={e=>setRatings(old=>({...old,[selectedMaterial.id]:e.target.value}))}><option value="">Choose /5</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} / 5</option>)}</select></label><button className="secondary-btn" onClick={()=>setNotice(ratings[selectedMaterial.id]?`Your ${ratings[selectedMaterial.id]}/5 rating is saved in this browser demo.`:'Choose a rating before submitting.')}>Submit rating</button></div><section className="version-history-section"><div className="version-heading"><div><h3>Version history</h3><p className="muted-copy">Previous versions are kept separately so updates do not overwrite the original.</p></div><span className="version-count">{materialVersions.length} version{materialVersions.length===1?'':'s'}</span></div>{materialVersions.length ? <div className="version-list">{materialVersions.map(v=><article className="version-row" key={v.version}><div><b>Version {v.version}</b><small>{v.updatedAt ? new Date(v.updatedAt).toLocaleString() : 'Date unavailable'}</small><p>{(v.content || '').slice(0,150)}{(v.content || '').length>150?'…':''}</p></div><button type="button" className="secondary-btn" onClick={()=>downloadMaterialVersion(v)}>Download v{v.version}</button></article>)}</div> : <p className="muted-copy">No version history available yet.</p>}<form className="version-form" onSubmit={addMaterialVersion}><label htmlFor="new-material-version">Upload a revised text version</label><textarea id="new-material-version" rows="4" value={versionDraft} onChange={e=>setVersionDraft(e.target.value)} placeholder="Paste the updated material content here…" required/><button className="primary-btn" type="submit" disabled={versionBusy || !versionDraft.trim()}>{versionBusy?'Saving…':'＋ Save new version'}</button></form></section><div className="discussion-area"><h3>Discussion</h3><p className="muted-copy">Reply to comments and replies up to three levels deep.</p>{(materialComments[selectedMaterial.id]||[]).map(c=><ThreadComment key={c.id} comment={c} onReply={addThreadReply}/>)}{!(materialComments[selectedMaterial.id]||[]).length&&<p className="muted-copy">No comments yet. Start the discussion.</p>}<form onSubmit={e=>{e.preventDefault();addComment()}} className="comment-form"><input value={commentDraft} onChange={e=>setCommentDraft(e.target.value)} placeholder="Write a comment..." aria-label="Write a comment"/><button className="primary-btn" type="submit">Post</button></form></div></section></div>}
   {materialUploadOpen && <div className="modal-backdrop" role="presentation" onClick={()=>setMaterialUploadOpen(false)}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="upload-title" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setMaterialUploadOpen(false)} aria-label="Close">×</button><p className="eyebrow">MATERIAL MANAGEMENT</p><h2 id="upload-title">Add study material</h2><form className="stacked-form" onSubmit={uploadMaterial}><label>Title<input required value={uploadForm.title} onChange={e=>setUploadForm({...uploadForm,title:e.target.value})}/></label><label>Subject<select value={uploadForm.subject} onChange={e=>setUploadForm({...uploadForm,subject:e.target.value})}>{['Computer Science','Database Systems','Software Engineering','Computer Networks','Operating Systems','Other'].map(s=><option key={s}>{s}</option>)}</select></label><label>Topic / tags<input value={uploadForm.topic} onChange={e=>setUploadForm({...uploadForm,topic:e.target.value})} placeholder="e.g. Trees, BFS, DFS"/></label><label>Description<input value={uploadForm.description} onChange={e=>setUploadForm({...uploadForm,description:e.target.value})}/></label><label>Material content<textarea required rows="6" value={uploadForm.content} onChange={e=>setUploadForm({...uploadForm,content:e.target.value})} placeholder="Paste study notes here. Text-file import is supported below."/></label><label>Import a text file<input type="file" accept=".txt,.md,.csv,text/plain,text/markdown" onChange={async e=>{const file=e.target.files?.[0];if(file){const content=await file.text();setUploadForm(old=>({...old,title:old.title||file.name.replace(/\\.[^.]+$/,''),content}));}}}/></label><button className="primary-btn" type="submit">Save material</button></form></section></div>}
   {authOpen && <div className="modal-backdrop" role="presentation" onClick={()=>setAuthOpen(false)}><section className="modal-card auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setAuthOpen(false)} aria-label="Close">×</button><p className="eyebrow">STUDYSPACE ACCOUNT</p><h2 id="auth-title">{authMode==='login'?'Welcome back':'Create your account'}</h2><div className="demo-access"><p className="muted-copy">Quick demo access (local-only; no password or backend required)</p><div className="auth-tabs"><button type="button" onClick={()=>enterDemoRole('student')}>Student demo</button><button type="button" onClick={()=>enterDemoRole('instructor')}>Instructor demo</button><button type="button" onClick={()=>enterDemoRole('admin')}>Admin demo</button></div></div><div className="auth-tabs"><button className={authMode==='login'?'selected':''} onClick={()=>{setAuthMode('login');setAuthError('')}}>Sign in</button><button className={authMode==='register'?'selected':''} onClick={()=>{setAuthMode('register');setAuthError('')}}>Register</button></div><form className="stacked-form" onSubmit={submitAuth}><label>Email<input required type="email" autoComplete="email" value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})}/></label><label>Password<input required type="password" minLength="8" autoComplete={authMode==='login'?'current-password':'new-password'} value={authForm.password} onChange={e=>setAuthForm({...authForm,password:e.target.value})}/></label>{authMode==='register'&&<label>Role<select value={authForm.role} onChange={e=>setAuthForm({...authForm,role:e.target.value})}><option value="student">Student</option><option value="instructor">Instructor</option></select></label>}{authError&&<p className="form-message" role="status">{authError}</p>}<button className="primary-btn" disabled={authBusy} type="submit">{authBusy?'Please wait…':authMode==='login'?'Sign in':'Create account'}</button></form><p className="muted-copy">Requires the local API. Passwords are sent only to the backend authentication endpoint.</p></section></div>}
   <footer className="footer"><span>StudySpace · Collaborative Learning</span><span>Demo data · {apiStatus==='connected'?'served by local API':'local fallback active'}</span></footer>
  </main>
 </div>;
}
