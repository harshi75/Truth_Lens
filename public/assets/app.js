(() => {
  'use strict';

  const DEMO = [
    {claim:"India's literacy rate is 95%.",verdict:"CONTRADICTED",cls:"con",summary:"Available evidence directly conflicts with this numerical claim."},
    {claim:"The city council approved the new transit budget after a public hearing.",verdict:"SUPPORTED",cls:"sup",summary:"Available evidence substantially supports this claim."},
    {claim:"The satellite cost ₹500 crore and will provide internet to 10 million people.",verdict:"MIXED",cls:"mix",summary:"Some elements are supported while other details remain contradicted or unverified."},
    {claim:"No COVID-19 vaccine had been authorized anywhere in the world.",verdict:"OUTDATED",cls:"out",summary:"This may have been accurate at an earlier point, but later regulatory records changed the factual situation."},
    {claim:"A rare triple rainbow was photographed over Lagos this week.",verdict:"INSUFFICIENT_EVIDENCE",cls:"ins",summary:"The available evidence is not sufficient to establish the claim. That does not mean the claim is false."}
  ];

  function esc(v){ const d=document.createElement('div'); d.textContent=v==null?'':String(v); return d.innerHTML; }
  function fmtDate(v){ if(!v)return '—'; try{return new Date(v).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});}catch{return v;} }
  function cls(v){ return ({SUPPORTED:'sup',CONTRADICTED:'con',MIXED:'mix',OUTDATED:'out',INSUFFICIENT_EVIDENCE:'ins',NOT_VERIFIABLE:'ins'})[v]||'ins'; }
  function label(v){ return (v||'').replaceAll('_',' '); }

  async function api(path, opts={}) {
    const res=await fetch(path,{headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});
    let data=null; try{data=await res.json();}catch{}
    if(!res.ok) throw new Error(data?.error||`Request failed (${res.status})`);
    return data;
  }

  function renderSources(items=[]){
    if(!items.length) return '<div class="empty">No evidence in this category.</div>';
    return items.map(s=>`<div class="evidence"><h4>${esc(s.title||'Source')}</h4><p><b>${esc(s.publisher||'Unknown publisher')}</b>${s.publicationDate?' · '+esc(fmtDate(s.publicationDate)):''}</p><p>${esc(s.excerpt||'No excerpt available.')}</p>${s.url&&s.url.startsWith('http')?`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">Open source ↗</a>`:''}</div>`).join('');
  }

  function resultHtml(d, original=''){
    const claim=d.claim||original;
    return `<div class="resultpanel">
      <div class="resulttop"><div><span class="badge ${cls(d.verdict)}">${esc(label(d.verdict))}</span><div class="claim">“${esc(claim)}”</div></div><strong>${esc(d.evidenceStrength||'—')}</strong></div>
      <p>${esc(d.summary||'Verification completed.')}</p>
      ${d.datasetDisclaimer?`<div class="notice">${esc(d.datasetDisclaimer)}</div>`:''}
      <div class="evidencegrid">
        <div class="evidencegroup"><h3>Supporting evidence</h3>${renderSources(d.supportingEvidence)}</div>
        <div class="evidencegroup"><h3>Contradicting evidence</h3>${renderSources(d.contradictingEvidence)}</div>
        <div class="evidencegroup"><h3>Context</h3>${renderSources(d.contextEvidence)}</div>
      </div>
      <div class="card" style="margin-top:20px"><h3>What we know</h3>${(d.whatWeKnow||[]).length?`<ul>${d.whatWeKnow.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p>No direct evidence statements were returned.</p>'}</div>
      <div class="card" style="margin-top:16px"><h3>What we don't know</h3>${(d.whatWeDontKnow||[]).length?`<ul>${d.whatWeDontKnow.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p>No additional uncertainty was recorded.</p>'}</div>
      <div class="card" style="margin-top:16px"><h3>Audit trail</h3><ol>${(d.auditTrail||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div>
      ${d.id?`<div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap"><a class="btn dark" href="claim.html?id=${encodeURIComponent(d.id)}">Open full report</a><a class="btn ghost" href="/api/claims/${encodeURIComponent(d.id)}/report" target="_blank">Print report</a></div>`:''}
    </div>`;
  }

  window.verifyClaim = async function(){
    const input=document.querySelector('#claimInput'), out=document.querySelector('#verifyResult');
    if(!input||!out)return;
    const claim=input.value.trim();
    if(!claim){out.innerHTML='<div class="empty">Enter a claim first.</div>';return;}
    out.innerHTML='<div class="empty">Analyzing claim and comparing available evidence…</div>';
    try{ const d=await api('/api/verify',{method:'POST',body:JSON.stringify({claim})}); out.innerHTML=resultHtml(d,claim); }
    catch(e){ out.innerHTML=`<div class="empty"><b>Verification failed.</b><br>${esc(e.message)}<br><br>Try one of the demo claims or check that the Node server is running.</div>`; }
  };

  // ---------------------------------------------------------------------
  // Verify page tabs: Single Claim / Article-Text / URL. All three feed
  // into the same /api/verify endpoint per-claim; Article/URL just add an
  // extraction step first so a user can pick which sentence to check.
  // ---------------------------------------------------------------------
  window.switchVerifyTab = function(which){
    ['single','article','url'].forEach(name=>{
      const tab=document.querySelector('#tab-'+name), panel=document.querySelector('#panel-'+name);
      if(tab) tab.classList.toggle('active', name===which);
      if(panel) panel.style.display = name===which ? '' : 'none';
    });
  };

  function claimsListHtml(claims, containerId){
    return `<div class="card"><h3>Extracted claims (${claims.length})</h3>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px">
        ${claims.map((c,i)=>`
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;border:1px solid var(--line);border-radius:10px;padding:12px 14px">
            <div><span class="badge ${c.type==='FACTUAL'?'sup':'ins'}" style="margin-right:10px">${esc(label(c.type))}</span>${esc(c.text)}</div>
            <button type="button" class="btn dark" data-extract-i="${i}" data-container="${containerId}">Verify →</button>
          </div>`).join('')}
      </div>
      <div id="${containerId}-result" style="margin-top:20px"></div>
    </div>`;
  }

  let lastExtractedClaims = { article: [], url: [] };

  function wireExtractButtons(containerId, which){
    document.querySelectorAll(`[data-container="${containerId}"]`).forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const i = Number(btn.dataset.extractI);
        const claim = lastExtractedClaims[which][i]?.text;
        if(!claim) return;
        const resultBox = document.querySelector('#'+containerId+'-result');
        resultBox.innerHTML = '<div class="empty">Analyzing claim and comparing available evidence…</div>';
        try{ const d=await api('/api/verify',{method:'POST',body:JSON.stringify({claim})}); resultBox.innerHTML=resultHtml(d,claim); }
        catch(e){ resultBox.innerHTML=`<div class="empty"><b>Verification failed.</b><br>${esc(e.message)}</div>`; }
      });
    });
  }

  window.extractFromArticle = async function(){
    const input=document.querySelector('#articleInput'), out=document.querySelector('#articleClaims');
    if(!input||!out)return;
    const text=input.value.trim();
    if(!text){out.innerHTML='<div class="empty">Paste some article text first.</div>';return;}
    out.innerHTML='<div class="empty">Extracting checkable claims…</div>';
    try{
      const d=await api('/api/claims/extract',{method:'POST',body:JSON.stringify({text})});
      lastExtractedClaims.article = d.claims;
      out.innerHTML = claimsListHtml(d.claims, 'articleClaims');
      wireExtractButtons('articleClaims', 'article');
    }catch(e){ out.innerHTML=`<div class="empty"><b>Extraction failed.</b><br>${esc(e.message)}</div>`; }
  };

  window.extractFromUrl = async function(){
    const input=document.querySelector('#urlInput'), out=document.querySelector('#urlClaims');
    if(!input||!out)return;
    const url=input.value.trim();
    if(!url){out.innerHTML='<div class="empty">Enter a URL first.</div>';return;}
    out.innerHTML='<div class="empty">Fetching page and extracting checkable claims…</div>';
    try{
      const d=await api('/api/url/extract',{method:'POST',body:JSON.stringify({url})});
      lastExtractedClaims.url = d.claims;
      out.innerHTML = claimsListHtml(d.claims, 'urlClaims');
      wireExtractButtons('urlClaims', 'url');
    }catch(e){ out.innerHTML=`<div class="empty"><b>Could not read that URL.</b><br>${esc(e.message)}</div>`; }
  };

  async function initDashboard(){
    if(!document.querySelector('#dashboardStats'))return;
    try{
      const [stats,recent]=await Promise.all([api('/api/stats'),api('/api/claims?limit=10')]);
      const ids={total:'total',SUPPORTED:'supported',CONTRADICTED:'contradicted',MIXED:'mixed',INSUFFICIENT_EVIDENCE:'insufficient',OUTDATED:'outdated'};
      Object.entries(ids).forEach(([k,id])=>{const el=document.querySelector('#stat-'+id);if(el)el.textContent=stats[k]??0;});
      const body=document.querySelector('#recentRows');
      if(body) body.innerHTML=recent.length?recent.map(r=>`<tr><td>${esc((r.claim||'').slice(0,90))}${(r.claim||'').length>90?'…':''}</td><td><span class="badge ${cls(r.verdict)}">${esc(label(r.verdict))}</span></td><td>${esc(r.evidenceStrength||'—')}</td><td>${esc(fmtDate(r.createdAt))}</td><td><a href="claim.html?id=${r.id}">View</a></td></tr>`).join(''):'<tr><td colspan="5">No verifications yet. <a href="verify.html">Verify your first claim.</a></td></tr>';
    }catch(e){const n=document.querySelector('#dashboardError');if(n)n.textContent=e.message;}
  }

  async function initHistory(){
    const body=document.querySelector('#historyRows'); if(!body)return;
    try{
      const rows=await api('/api/claims?limit=100');
      const render=(items)=>body.innerHTML=items.length?items.map(r=>`<tr><td>${esc(r.claim)}</td><td><span class="badge ${cls(r.verdict)}">${esc(label(r.verdict))}</span></td><td>${esc(r.evidenceStrength||'—')}</td><td>${esc(fmtDate(r.createdAt))}</td><td><a href="claim.html?id=${r.id}">View</a></td></tr>`).join(''):'<tr><td colspan="5">No verification history yet.</td></tr>';
      render(rows);
      const search=document.querySelector('#historySearch');
      search?.addEventListener('input',()=>render(rows.filter(r=>(r.claim||'').toLowerCase().includes(search.value.toLowerCase()))));
    }catch(e){body.innerHTML=`<tr><td colspan="5">${esc(e.message)}</td></tr>`;}
  }

  async function initReports(){
    const wrap=document.querySelector('#reportsList'); if(!wrap)return;
    try{
      const rows=await api('/api/claims?limit=100');
      wrap.innerHTML=rows.length?rows.map(r=>`<div class="reportrow"><div><span class="badge ${cls(r.verdict)}">${esc(label(r.verdict))}</span><h3>${esc(r.claim)}</h3><p>${esc(r.summary||'')} · ${esc(fmtDate(r.createdAt))}</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn ghost" href="claim.html?id=${r.id}">View</a><a class="btn dark" href="/api/claims/${r.id}/report" target="_blank">Print / Save</a></div></div>`).join(''):'<div class="empty"><h3>No generated reports yet.</h3><p>Verify a claim and your report will appear here.</p><a class="btn dark" href="verify.html">Verify a Claim</a></div>';
    }catch(e){wrap.innerHTML=`<div class="empty">${esc(e.message)}</div>`;}
  }

  async function initClaim(){
    const wrap=document.querySelector('#claimDetail'); if(!wrap)return;
    const id=new URLSearchParams(location.search).get('id');
    if(!id || !/^\d+$/.test(id)){wrap.innerHTML='<div class="empty">No verification ID was provided. <a href="history.html">Open history</a>.</div>';return;}
    try{
      const d=await api('/api/claims/'+encodeURIComponent(id));
      wrap.innerHTML=resultHtml(d);
    }catch(e){
      wrap.innerHTML=`<div class="empty"><b>Could not load this report.</b><br>${esc(e.message)}<br><br>Check that the server is running and that this link points at the same server the claim was verified on.</div>`;
    }
  }

  function initDemo(){
    const list=document.querySelector('#claimButtons'), out=document.querySelector('#demoResult'); if(!list||!out)return;
    function show(i){const d=DEMO[i];list.innerHTML=DEMO.map((x,n)=>`<button class="${n===i?'active':''}" data-i="${n}">${esc(x.claim)}</button>`).join('');out.innerHTML=`<span class="badge ${d.cls}">${esc(label(d.verdict))}</span><h3>“${esc(d.claim)}”</h3><p>${esc(d.summary)}</p><div class="source"><b>Demo evidence mode</b><br>Use Verify to run the claim through the actual Express + SQLite backend.</div>`;list.querySelectorAll('button').forEach(b=>b.onclick=()=>show(Number(b.dataset.i)));}
    show(0);
  }

  function initAuth(){
    document.querySelectorAll('[data-demo-auth]').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();localStorage.setItem('truthlensDemoUser','1');location.href='dashboard.html';}));
    document.querySelectorAll('[data-demo-logout]').forEach(b=>b.addEventListener('click',()=>{localStorage.removeItem('truthlensDemoUser');location.href='index.html';}));
  }

  function initContact(){
    const form=document.querySelector('#contactForm'); if(!form)return;
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      const status=document.querySelector('#contactStatus');
      status.textContent='Sending…';
      try{
        const d=await api('/api/contact',{method:'POST',body:JSON.stringify({
          name:document.querySelector('#contactName').value,
          email:document.querySelector('#contactEmail').value,
          subject:document.querySelector('#contactSubject').value,
          message:document.querySelector('#contactMessage').value
        })});
        status.textContent=d.message||'Message sent.';
        form.reset();
      }catch(err){status.textContent=err.message;}
    });
  }

  document.addEventListener('DOMContentLoaded',()=>{
    initDashboard(); initHistory(); initReports(); initClaim(); initDemo(); initAuth(); initContact();
    document.querySelectorAll('.menu').forEach(btn=>btn.addEventListener('click',()=>document.querySelector('.navlinks')?.classList.toggle('open')));
  });
})();
