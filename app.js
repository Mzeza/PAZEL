const KEY="my_planner_v1";
const pad=n=>String(n).padStart(2,"0");
const now=new Date();

// Jalali/Persian calendar helpers. We use the browser's built-in
// Persian calendar for conversion so the calendar and the selected-date
// label always refer to exactly the same Jalali date.
const persianFormatter=new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-latn",{
  timeZone:"UTC",year:"numeric",month:"numeric",day:"numeric"
});
function persianParts(date){
  const out={};
  persianFormatter.formatToParts(date).forEach(p=>{if(p.type==="year"||p.type==="month"||p.type==="day")out[p.type]=Number(p.value)});
  return {jy:out.year,jm:out.month,jd:out.day};
}
function currentJalali(){return persianParts(new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())))}
function jalaliToGregorian(jy,jm,jd){
  // Search a small window around the corresponding Gregorian year.
  // This avoids mixing Gregorian month indexes with Jalali month indexes.
  const base=Date.UTC(jy+621,jm-1,jd);
  for(let delta=-370;delta<=370;delta++){
    const d=new Date(base+delta*86400000);
    const p=persianParts(d);
    if(p.jy===jy&&p.jm===jm&&p.jd===jd)return new Date(d.getTime()+12*60*60*1000);
  }
  throw new Error("Invalid Jalali date");
}
function jalaliMonthLength(y,m){
  const a=jalaliToGregorian(y,m,1);
  const b=m===12?jalaliToGregorian(y+1,1,1):jalaliToGregorian(y,m+1,1);
  return Math.round((b-a)/86400000);
}
const currentJ=currentJalali();
const defaultData={
 tab:"planner", selectedDay:currentJ.jd, selectedMonth:currentJ.jm-1, selectedYear:currentJ.jy,
 notes:[], goals:{year:[],month:[],week:[]}, habits:[], events:{}
};
let data=JSON.parse(localStorage.getItem(KEY)||"null")||defaultData;
// Migrate the date-selection fields from the old Gregorian implementation.
if(data.selectedYear>1500){data.selectedDay=currentJ.jd;data.selectedMonth=currentJ.jm-1;data.selectedYear=currentJ.jy}
function save(){localStorage.setItem(KEY,JSON.stringify(data))}

function openSettings(){
 document.getElementById("settingsMenu").classList.add("show");
}
function closeSettings(){
 document.getElementById("settingsMenu").classList.remove("show");
}
function resetPlanner(){
 const ok=confirm("⚠️ شروع دوباره پلنر\n\nتمام یادداشت‌ها، اهداف، عادت‌ها و برنامه‌های ساعتی شما حذف می‌شوند.\n\nآیا مطمئن هستید؟");
 if(!ok)return;
 localStorage.removeItem(KEY);
 data={
  tab:"planner",
  selectedDay:new Date().getDate(),
  selectedMonth:new Date().getMonth(),
  selectedYear:new Date().getFullYear(),
  notes:[],
  goals:{year:[],month:[],week:[]},
  habits:[],
  events:{}
 };
 localStorage.setItem(KEY,JSON.stringify(data));
 location.reload();
}
function faDate(d=new Date()){return new Intl.DateTimeFormat("fa-IR-u-ca-persian",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(d)}
function selectedGregorian(){return jalaliToGregorian(data.selectedYear,data.selectedMonth+1,data.selectedDay)}
function dateKey(){return `${data.selectedYear}-${pad(data.selectedMonth+1)}-${pad(data.selectedDay)}`}
function title(t){document.getElementById("pageTitle").textContent=t;document.getElementById("todayLabel").textContent=faDate(now)}
function render(){document.querySelectorAll(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.tab===data.tab)); if(data.tab==="planner")renderPlanner(); if(data.tab==="habits")renderHabits(); if(data.tab==="notes")renderNotes(); save()}
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>{data.tab=b.dataset.tab;render()});
document.getElementById("menuBtn").onclick=openSettings;
function calendar(){
 let y=data.selectedYear,m=data.selectedMonth+1,days=jalaliMonthLength(y,m);
 const first=jalaliToGregorian(y,m,1);
 const offset=(first.getUTCDay()+1)%7; // Persian week starts Saturday
 const monthName=new Intl.DateTimeFormat("fa-IR-u-ca-persian",{month:"long",year:"numeric"}).format(first);
 let h=`<div class="card"><div class="section-title"><button class="icon-btn" onclick="changeMonth(-1)">‹</button><b>${monthName}</b><button class="icon-btn" onclick="changeMonth(1)">›</button></div><div class="grid">`;
 ["ش","ی","د","س","چ","پ","ج"].forEach(x=>h+=`<div class="day-head">${x}</div>`);
 for(let i=0;i<offset;i++)h+="<div></div>";
 for(let d=1;d<=days;d++){
   const selected=d===data.selectedDay;
   const isToday=d===currentJ.jd&&m===currentJ.jm&&y===currentJ.jy;
   h+=`<button class="day ${selected?"selected":""} ${isToday?"today":""}" onclick="selectDay(${d})">${new Intl.NumberFormat("fa-IR").format(d)}</button>`;
 }
 return h+"</div></div>"
}
function renderPlanner(){
 title("پلنر ساعتی");
 const d=selectedGregorian();
 const key=dateKey(), events=data.events[key]||{};
 let h=calendar()+`<div class="section-title"><b>${faDate(d)}</b><span class="muted">برنامه امروز</span></div>`;
 h+=`<div class="card">`;
 for(let i=0;i<24;i++){let t=pad(i)+":00",ev=events[t]||"";h+=`<div class="time-row"><div class="time">${t}</div><div>${ev?`<div class="event ${["green","blue","yellow","pink","purple"][i%5]}">${esc(ev)}</div>`:""}</div></div>`}
 h+=`</div><button class="fab" onclick="addEvent()">+</button>`;document.getElementById("content").innerHTML=h
}
function changeMonth(n){
 data.selectedMonth+=n;
 if(data.selectedMonth<0){data.selectedMonth=11;data.selectedYear--}
 if(data.selectedMonth>11){data.selectedMonth=0;data.selectedYear++}
 data.selectedDay=Math.min(data.selectedDay,jalaliMonthLength(data.selectedYear,data.selectedMonth+1));
 render()
}
function selectDay(d){data.selectedDay=d;render()}
function renderHabits(){
 title("عادت‌های ماه");
 let monthKey=`${data.selectedYear}-${pad(data.selectedMonth+1)}`,days=jalaliMonthLength(data.selectedYear,data.selectedMonth+1);
 let total=0,done=0;
 data.habits.forEach(x=>{for(let d=1;d<=days;d++){total++;if(x.done[`${monthKey}-${pad(d)}`])done++}});
 let pct=total?Math.round(done/total*100):0;
 let h=`<div class="card hero"><div class="emoji">🎯</div><h2>عادت‌های خود را بسازید</h2><div class="muted">پیگیری عادت‌ها در طول ماه</div></div><div class="section-title"><b>پیگیری عادت‌ها</b><button class="btn" onclick="addHabit()">+ عادت</button></div>`;
 h+=`<div class="card"><div class="grid" style="margin-bottom:10px">${["ش","ی","د","س","چ","پ","ج"].map(x=>`<div class="day-head">${x}</div>`).join("")}</div>`;
 data.habits.forEach(x=>{h+=`<div class="list-row"><div class="grow"><b style="font-size:12px">${esc(x.name)}</b><div class="progress" style="margin-top:7px"><i style="width:${Math.round(Object.keys(x.done).filter(k=>k.startsWith(monthKey)&&x.done[k]).length/days*100)}%"></i></div></div><button class="icon-btn" onclick="habitDetail(${x.id})">›</button></div>`});
 h+=`</div><div class="stat-grid"><div class="stat"><strong>${data.habits.length}</strong><span class="muted">عادت‌ها</span></div><div class="stat"><strong>${done}</strong><span class="muted">انجام‌شده</span></div><div class="stat"><strong>${pct}%</strong><span class="muted">پیشرفت</span></div></div>`;
 h+=`<div class="card"><b>ثبت امروز</b>${data.habits.map(x=>{let k=dateKey(),ok=!!x.done[k];return `<div class="list-row"><div class="check ${ok?"done":""}" onclick="toggleHabit(${x.id})">${ok?"✓":""}</div><div class="grow">${esc(x.name)}</div></div>`}).join("")}</div>`;
 document.getElementById("content").innerHTML=h
}
function toggleHabit(id){let x=data.habits.find(a=>a.id===id),k=dateKey();x.done[k]=!x.done[k];render()}
function addHabit(){openModal(`<h3>افزودن عادت</h3><input id="habitName" class="input" placeholder="مثلاً ورزش صبحگاهی"><br><br><button class="btn full" onclick="saveHabit()">ذخیره</button>`)}
function saveHabit(){let n=document.getElementById("habitName").value.trim();if(!n)return;data.habits.push({id:Date.now(),name:n,done:{}});closeModal();render()}
function habitDetail(id){let x=data.habits.find(a=>a.id===id);openModal(`<h3>جزئیات عادت</h3><div class="card"><b>${esc(x.name)}</b><p class="muted">با انتخاب روزهای ماه می‌توانید میزان پایبندی خود را ثبت کنید.</p></div><button class="btn full" onclick="deleteHabit(${id})">حذف عادت</button>`)}
function deleteHabit(id){data.habits=data.habits.filter(x=>x.id!==id);closeModal();render()}
function renderNotes(){
 title("یادداشت‌ها و اهداف");
 let h=`<div class="tabs">${["year","month","week"].map((x,i)=>`<button class="${i===0?"active":""}" onclick="showGoals('${x}')">${["اهداف سال","اهداف ماه","اهداف هفته"][i]}</button>`).join("")}</div>`;
 h+=`<div class="card"><div class="section-title"><b>یادداشت‌ها</b><button class="btn" onclick="addNote()">+ یادداشت</button></div>`;
 if(!data.notes.length)h+=`<div class="empty">هنوز یادداشتی ثبت نشده است.</div>`;else data.notes.forEach((n,i)=>h+=`<div class="note"><h3>${esc(n.title)}</h3><p>${esc(n.text)}</p></div>`);
 h+=`</div><div id="goalBox"></div>`;document.getElementById("content").innerHTML=h;showGoals("year")
}
function showGoals(type){
 document.querySelectorAll(".tabs button").forEach((b,i)=>b.classList.toggle("active",["year","month","week"][i]===type));
 let arr=data.goals[type]||[];let labels={year:"اهداف سال",month:"اهداف ماه",week:"اهداف هفته"};
 document.getElementById("goalBox").innerHTML=`<div class="section-title"><b>${labels[type]}</b><button class="btn" onclick="addGoal('${type}')">+ هدف جدید</button></div><div class="card">${arr.length?arr.map((g,i)=>`<div class="list-row"><div class="check ${g.done?"done":""}" onclick="toggleGoal('${type}',${i})">${g.done?"✓":""}</div><div class="grow">${esc(g.text)}</div></div>`).join(""):`<div class="empty">هدفی ثبت نشده است.</div>`}</div>`
}
function addGoal(type){openModal(`<h3>هدف جدید</h3><input id="goalText" class="input" placeholder="هدف خود را بنویسید"><br><br><button class="btn full" onclick="saveGoal('${type}')">ذخیره</button>`)}
function saveGoal(type){let v=document.getElementById("goalText").value.trim();if(!v)return;data.goals[type].push({text:v,done:false});closeModal();render()}
function toggleGoal(type,i){data.goals[type][i].done=!data.goals[type][i].done;render()}
function addNote(){openModal(`<h3>یادداشت جدید</h3><input id="noteTitle" class="input" placeholder="عنوان"><br><br><textarea id="noteText" class="textarea" placeholder="متن یادداشت"></textarea><br><br><button class="btn full" onclick="saveNote()">ذخیره</button>`)}
function saveNote(){let a=document.getElementById("noteTitle").value.trim(),b=document.getElementById("noteText").value.trim();if(!a&&!b)return;data.notes.unshift({title:a||"یادداشت",text:b});closeModal();render()}
function addEvent(){openModal(`<h3>افزودن برنامه</h3><select id="eventTime" class="input">${Array.from({length:24},(_,i)=>`<option>${pad(i)}:00</option>`).join("")}</select><br><br><input id="eventText" class="input" placeholder="مثلاً جلسه کاری"><br><br><button class="btn full" onclick="saveEvent()">ذخیره</button>`)}
function saveEvent(){let t=document.getElementById("eventTime").value,v=document.getElementById("eventText").value.trim();if(!v)return;data.events[dateKey()]??={};data.events[dateKey()][t]=v;closeModal();render()}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function openModal(content){let m=document.getElementById("modal");if(!m){m=document.createElement("div");m.id="modal";m.className="modal";document.body.appendChild(m)}m.innerHTML=`<div class="sheet">${content}<br><button class="btn outline full" onclick="closeModal()">انصراف</button></div>`;m.classList.add("show")}
function closeModal(){document.getElementById("modal")?.classList.remove("show")}
function toast(t){let x=document.getElementById("toast");x.textContent=t;x.style.cssText="position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#252033;color:#fff;padding:10px 16px;border-radius:12px;z-index:30;font-size:12px";setTimeout(()=>x.remove(),1800)}
window.addEventListener("beforeunload",save);document.addEventListener("visibilitychange",save);render();