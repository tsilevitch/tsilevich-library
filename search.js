(function (root) {
  'use strict';
  const stop = new Set('а без был была были быть в во вот все всего вы где да для до его ее если есть еще же за зачем здесь и из или их к как какой какая какие когда кто ли мне может можно мы на надо нас не нет но нужно о об он она они от по под почему при про с со так там то только у уже что чтобы это я нам вам мой наш ваш делать сделать'.split(' '));
  const generic = new Set(['поставщик','закупк','компани','вопрос','публикац','пост','стат','материал']);
  function norm(s) { return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim(); }
  function stem(s) {
    if (s.length < 5 || /^[a-z0-9]+$/.test(s)) return s;
    return s.replace(/(иями|ями|ами|иями|овать|ировать|ение|ения|ению|ений|ости|ость|щики|щику|щиком|щиками|щика|щикам|щиков|ского|ских|ской|ские|ский|ого|ему|ому|ыми|ими|ыми|ах|ях|ом|ем|ой|ей|ая|яя|ое|ее|ые|ие|ий|ый|ую|юю|ам|ям|ов|ев|ы|и|а|я|у|ю|е|о)$/u, (ending) => ending.startsWith('щик') ? 'щик' : '');
  }
  function tokens(s) { return [...new Set(norm(s).split(' ').filter(w => w.length > 1 && !stop.has(w)).map(stem))]; }
  function close(a, b) {
    if (a === b) return true;
    if (Math.min(a.length,b.length) < 5 || Math.abs(a.length-b.length)>1) return false;
    let i=0,j=0,errors=0;
    while(i<a.length && j<b.length) {
      if(a[i]===b[j]) {i++;j++;continue;}
      if(++errors>1) return false;
      if(a.length>=b.length) i++;
      if(b.length>=a.length) j++;
    }
    return errors+(i<a.length || j<b.length ? 1 : 0)<=1;
  }
  function prepare(catalog) {
    const terms = catalog.terms.map(t=>({...t,_patterns:[...t.patterns,...t.queries].map(p=>new RegExp(p,'iu'))}));
    const docs = catalog.posts.map(p => ({...p,_title:tokens(p.title),_summary:tokens(p.summary),_tokens:tokens(p.text+' '+p.title+' '+p.summary),_strength:Object.fromEntries(catalog.terms.map(t=>{
      const hit=s=>t.patterns.some(pattern=>new RegExp(pattern,'iu').test(s.toLowerCase().replace(/ё/g,'е')));
      return [t.id,(hit(p.title)?16:0)+(hit(p.summary)?8:0)];
    }))}));
    return {docs,terms};
  }
  function termMatches(query, terms) {
    const lower=String(query).toLowerCase().replace(/ё/g,'е');
    return terms.filter(t=>t._patterns.some(p=>p.test(lower)) || norm(t.name)===norm(query)).map(t=>t.id);
  }
  function search(index, {query='',topic='',term='',sort='relevance'}={}) {
    const q=tokens(query);
    const specific=q.filter(x=>!generic.has(x));
    const important=specific.length?specific:q;
    let concepts=termMatches(query,index.terms);
    if(concepts.length>1) concepts=concepts.filter(id=>id!=='negotiation');
    const phrase=norm(query);
    return index.docs.filter(p=>(!topic||p.topics.includes(topic))&&(!term||p.terms.includes(term))).map(p=>{
      if (!q.length) return {post:p,score:0};
      let titleHits=0,summaryHits=0,hits=0;
      for(const token of important){
        if(p._tokens.some(t=>close(t,token))) hits++;
        if(p._title.some(t=>close(t,token))) titleHits++;
        if(p._summary.some(t=>close(t,token))) summaryHits++;
      }
      const conceptHits=concepts.filter(t=>p.terms.includes(t)).length;
      const exact=phrase.length>3&&norm(p.title).includes(phrase);
      const enough=important.length && hits>=Math.max(1,Math.ceil(important.length*.6));
      if(concepts.length ? (!conceptHits&&!exact) : (!enough&&!exact)) return null;
      return {post:p,score:conceptHits*20+concepts.reduce((s,t)=>s+(p._strength[t]||0),0)+titleHits*12+summaryHits*4+hits*2+(exact?40:0)};
    }).filter(Boolean).sort((a,b)=>sort==='oldest'?a.post.id-b.post.id:sort==='newest'?b.post.id-a.post.id:b.score-a.score||b.post.id-a.post.id);
  }
  const api={norm,tokens,prepare,search,termMatches};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.LibrarySearch=api;
})(typeof window!=='undefined'?window:globalThis);
