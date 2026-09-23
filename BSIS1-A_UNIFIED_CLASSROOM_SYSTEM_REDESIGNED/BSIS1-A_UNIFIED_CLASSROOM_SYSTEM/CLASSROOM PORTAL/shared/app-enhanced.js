(function(){
  const root=document.body;
  if(!root)return;
  const bar=document.createElement('div');bar.className='ui-progress';document.body.appendChild(bar);
  const saved=localStorage.getItem('bsis-ui-theme');if(saved==='dark')root.classList.add('ui-dark');
  const headerActions=document.querySelector('.portal-header-actions');
  if(headerActions&&!document.querySelector('.ui-theme-toggle')){
    const b=document.createElement('button');b.className='ui-theme-toggle';b.type='button';b.title='Toggle appearance';b.setAttribute('aria-label','Toggle appearance');b.textContent=root.classList.contains('ui-dark')?'☀':'☾';
    b.addEventListener('click',()=>{root.classList.toggle('ui-dark');localStorage.setItem('bsis-ui-theme',root.classList.contains('ui-dark')?'dark':'light');b.textContent=root.classList.contains('ui-dark')?'☀':'☾'});headerActions.prepend(b);
  }
  addTilt();
  document.addEventListener('click',e=>{const el=e.target.closest('button,.module-card,.content-view-btn');if(!el)return;el.animate([{transform:'scale(.985)'},{transform:''}],{duration:160,easing:'ease-out'})},{passive:true});
  const update=()=>{const h=document.documentElement.scrollHeight-innerHeight;bar.style.width=(h>0?(scrollY/h)*100:0)+'%'};addEventListener('scroll',update,{passive:true});update();
  function addTilt(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;document.querySelectorAll('.module-card,.student-overview,.content-card,.today-card,.online-day-card,.officer-card').forEach(card=>{card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.transform=`perspective(900px) rotateX(${(-y*3).toFixed(2)}deg) rotateY(${(x*4).toFixed(2)}deg) translateY(-4px)`});card.addEventListener('pointerleave',()=>card.style.transform='')})}
})();
