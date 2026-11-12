(() => {
  'use strict';
  const data=window.CATALOG;
  if(!data){document.getElementById('results').textContent='Не удалось загрузить каталог. Обновите страницу.';return;}
  const engine=window.LibrarySearch,index=engine.prepare(data),$=id=>document.getElementById(id);
  const terms=new Map(data.terms.map(t=>[t.id,t])),topics=new Map(data.topics.map(t=>[t.id,t]));
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date=s=>new Date(s+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'short',year:'numeric'});
  const count=id=>data.posts.filter(p=>p.terms.includes(id)).length;
  const plural=(n,one,few,many)=>n%100>=11&&n%100<=14?many:n%10===1?one:n%10>=2&&n%10<=4?few:many;
  let state={view:'posts',query:'',topic:'',term:'',sort:'relevance',limit:12};
  function readHash(){
    const params=new URLSearchParams(location.hash.slice(1));
    state={view:params.get('view')==='terms'?'terms':'posts',query:(params.get('q')||'').slice(0,300),topic:topics.has(params.get('topic'))?params.get('topic'):'',term:terms.has(params.get('term'))?params.get('term'):'',sort:['newest','oldest'].includes(params.get('sort'))?params.get('sort'):'relevance',limit:12};
  }
  function save(replace=false){const p=new URLSearchParams();if(state.view==='terms')p.set('view','terms');if(state.query)p.set('q',state.query);if(state.topic)p.set('topic',state.topic);if(state.term)p.set('term',state.term);if(state.sort!=='relevance')p.set('sort',state.sort);history[replace?'replaceState':'pushState'](null,'',location.pathname+location.search+(p.size?'#'+p:''));}
  function change(next,replace=false){Object.assign(state,{limit:12},next);save(replace);render();}
  function related(term){return term.related.filter(id=>terms.has(id)).map(id=>`<button data-term="${id}">${esc(terms.get(id).name)}</button>`).join('');}
  function definitionSource(t){const s=t.definition_source;return s?`<a class="definition-source" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">Справочный источник: ${esc(s.title)} ↗</a>`:'';}
  function termPosts(t){const posts=engine.search(index,{term:t.id,query:t.name}).map(r=>r.post);return posts.length?`<div class="dictionary-posts"><strong>Публикации Анны</strong>${posts.slice(0,2).map(p=>`<a href="${p.url}" target="_blank" rel="noopener noreferrer">${esc(p.title)} ↗</a>`).join('')}<button class="text-button" data-term="${t.id}">Все публикации: ${posts.length} →</button></div>`:'';}
  function postCard(p){return `<article class="card"><div class="card-meta"><time datetime="${p.date}">${esc(date(p.date))}</time><span class="source-number">ПОСТ № ${p.id}</span></div><h3><a href="${p.url}" target="_blank" rel="noopener noreferrer">${esc(p.title)}</a></h3>${p.summaryKind==='excerpt'?'<div class="quote-label">ИЗ ПУБЛИКАЦИИ</div>':''}<p class="card-summary">${esc(p.summary)}</p><div class="card-tags">${p.terms.slice(0,3).map(id=>`<button class="tag" data-term="${id}">${esc(terms.get(id).name)}</button>`).join('')}</div><a class="card-link" href="${p.url}" target="_blank" rel="noopener noreferrer">Читать в Telegram <span aria-hidden="true">↗</span></a></article>`;}
  function termCard(t){return `<article class="card term-card"><button class="term-open" data-term="${t.id}"><h3>${esc(t.name)}</h3><p class="term-subtitle">${esc(t.subtitle)}</p></button><p class="card-summary">${esc(t.description)}</p>${definitionSource(t)}${termPosts(t)}<div class="term-links">Смежные понятия<br>${related(t)}</div></article>`;}
  function render(){
    $('search').value=state.query;$('sort').value=state.sort;
    document.querySelectorAll('[data-view]').forEach(button=>{const on=button.dataset.view===state.view;button.classList.toggle('active',on);if(on)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
    $('topics').innerHTML=`<button class="topic-button ${!state.topic?'active':''}" data-topic="" ${!state.topic?'aria-pressed="true"':'aria-pressed="false"'}>Все темы<span>${data.posts.length}</span></button>`+data.topics.map(t=>`<button class="topic-button ${state.topic===t.id?'active':''}" data-topic="${t.id}" aria-pressed="${state.topic===t.id}">${esc(t.title)}<span>${data.posts.filter(p=>p.topics.includes(t.id)).length}</span></button>`).join('');
    const active=terms.get(state.term);
    $('breadcrumb').textContent=state.topic?topics.get(state.topic).title:'Все темы';
    $('result-title').textContent=active?active.name:state.view==='terms'?'Словарь понятий':state.query?'Результаты поиска':'Публикации';
    $('term-detail').innerHTML=active?`<div class="term-detail"><span class="eyebrow">${esc(active.subtitle)}</span><p>${esc(active.description)}</p>${definitionSource(active)}<div class="term-links">Смежные понятия: ${related(active)}</div></div>`:state.view==='terms'?'<p class="dictionary-note">Справочные определения терминов. Публикации Анны приведены отдельно — как материалы по теме.</p>':'';
    document.querySelector('.sort-wrap').classList.toggle('hidden',state.view==='terms');
    let results=[];
    if(state.view==='terms'&&!active){
      const matches=engine.termMatches(state.query,index.terms);
      results=data.terms.filter(t=>(!state.topic||t.topics.includes(state.topic))&&(!state.query||matches.includes(t.id)||engine.norm(t.name+' '+t.subtitle+' '+t.description).includes(engine.norm(state.query)))).sort((a,b)=>a.name.localeCompare(b.name,'ru'));
      $('result-status').textContent=`${results.length} ${plural(results.length,'понятие','понятия','понятий')}`;
      $('results').innerHTML=results.map(termCard).join('');
      $('more').classList.add('hidden');
    }else{
      results=engine.search(index,active?{...state,query:active.name}:state);
      $('result-status').textContent=active?(results.length?'Публикации Анны по теме':''):`${results.length} ${plural(results.length,'публикация','публикации','публикаций')}${state.query?' по запросу «'+state.query+'»':''}`;
      $('results').innerHTML=results.slice(0,state.limit).map(r=>postCard(r.post)).join('');
      $('more').classList.toggle('hidden',results.length<=state.limit);
      $('more').innerHTML=`Показать ещё <span aria-hidden="true">↓</span><span>${Math.min(state.limit,results.length)} / ${results.length}</span>`;
    }
    if(!results.length&&!active){$('results').innerHTML='<div class="empty"><h3>Точного совпадения пока нет</h3><p>Попробуйте короткую формулировку: «отсрочка», «монополист», «запасы». Или откройте словарь и выберите близкое понятие.</p><button data-clear>Все публикации</button> <button data-view="terms">Открыть словарь</button></div>';}
  }
  $('search-form').addEventListener('submit',event=>{event.preventDefault();change({query:$('search').value.trim().slice(0,300),term:''});});
  let timer;
  $('search').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>change({query:$('search').value.trim().slice(0,300),term:''},true),220);});
  $('sort').addEventListener('change',()=>change({sort:$('sort').value}));
  $('reset').addEventListener('click',()=>change({topic:'',term:'',query:''}));
  $('more').addEventListener('click',()=>{state.limit+=12;render();});
  document.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-view'))change({view:b.dataset.view,term:'',query:''});
    if(b.hasAttribute('data-topic'))change({topic:b.dataset.topic,term:''});
    if(b.hasAttribute('data-term')){change({view:'terms',term:b.dataset.term,topic:'',query:''});$('content').scrollIntoView({behavior:'smooth',block:'start'});}
    if(b.hasAttribute('data-query'))change({view:'posts',query:b.dataset.query,topic:'',term:''});
    if(b.hasAttribute('data-clear'))change({view:'posts',query:'',topic:'',term:''});
  });
  window.addEventListener('hashchange',()=>{readHash();render();});
  window.addEventListener('popstate',()=>{readHash();render();});
  document.querySelector('.skip').addEventListener('click',event=>{event.preventDefault();$('content').focus();$('content').scrollIntoView();});
  const termCount=data.terms.length;
  $('coverage').textContent=`${data.posts.length} ${plural(data.posts.length,'публикация','публикации','публикаций')} · с ${date(data.since)} · ${termCount} ${plural(termCount,'понятие','понятия','понятий')}`;
  $('updated').textContent='Обновлено '+date(data.updatedAt.slice(0,10));
  readHash();render();
})();
