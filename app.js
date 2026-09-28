/* ===== KONFIGURASI: TEMPEL LINK GOOGLE SPREADSHEET KAMU DI SINI ===== */
// Contoh: 'https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit'
const SPREADSHEET_URL = 'https://script.google.com/macros/s/AKfycbyiJOsrZXo1Y4dP-AdbsIza5e9gmUWtscjwr-bi-0yfKcGpCbiJZOakQVSMXkfVMIFiXA/execPASTE_LINK_SPREADSHEET_KAMU_DI_SINI';

/* ===== TAB SWITCHING ===== */
function pindahTab(id){
  document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
  document.getElementById(id).style.display = 'block';

  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.tab-btn[data-tab="'+id+'"]').classList.add('active');

  if (id === 'tabDashboard') muatData();
}

/* ===== BORANG SURVEY ===== */
let preferensi = null;
let alasanTerpilih = new Set();
let ratingAtas = 0, ratingBawah = 0;

function pilihPreferensi(el){
  document.querySelectorAll('.choice').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  preferensi = el.dataset.value;
}

function buatChips(daftar){
  const wrap = document.getElementById('chipsAlasan');
  daftar.forEach(teks => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = teks;
    chip.onclick = () => {
      chip.classList.toggle('selected');
      if (chip.classList.contains('selected')) alasanTerpilih.add(teks);
      else alasanTerpilih.delete(teks);
      document.getElementById('alasanLain').style.display =
        alasanTerpilih.has('Lainnya') ? 'block' : 'none';
    };
    wrap.appendChild(chip);
  });
}

function buatBintang(target){
  const wrap = document.querySelector('.stars[data-target="'+target+'"]');
  for(let i=1;i<=5;i++){
    const s = document.createElement('span');
    s.className='star';
    s.textContent='⭐';
    s.dataset.value=i;
    s.onclick = () => {
      const val = i;
      if (target==='ratingAtas') ratingAtas = val; else ratingBawah = val;
      wrap.querySelectorAll('.star').forEach(st => {
        st.classList.toggle('on', Number(st.dataset.value) <= val);
      });
    };
    wrap.appendChild(s);
  }
}

buatBintang('ratingAtas');
buatBintang('ratingBawah');

// Ambil daftar alasan dari server (sinkron sama code.gs)
google.script.run.withSuccessHandler(buatChips).getDaftarAlasan();

document.getElementById('surveyForm').addEventListener('submit', function(e){
  e.preventDefault();
  const msg = document.getElementById('msg');
  const btn = document.getElementById('btnSubmit');

  if(!preferensi){ msg.textContent = 'Yuk pilih parkiran favoritmu dulu 🙏'; return; }
  if(ratingAtas===0 || ratingBawah===0){ msg.textContent = 'Kasih rating buat kedua area ya ⭐'; return; }

  btn.disabled = true;
  btn.textContent = 'Mengirim...';
  msg.textContent = '';

  const data = {
    nama: document.getElementById('nama').value,
    preferensi: preferensi,
    alasan: Array.from(alasanTerpilih),
    alasanLain: document.getElementById('alasanLain').value,
    ratingAtas: ratingAtas,
    ratingBawah: ratingBawah,
    saran: document.getElementById('saran').value
  };

  google.script.run
    .withSuccessHandler(() => {
      document.getElementById('cardForm').style.display = 'none';
      document.getElementById('successBox').style.display = 'block';
    })
    .withFailureHandler((err) => {
      btn.disabled = false;
      btn.textContent = 'Kirim Jawaban 🎀';
      msg.textContent = 'Gagal mengirim, coba lagi ya: ' + err.message;
    })
    .submitSurvey(data, SPREADSHEET_URL);
});

/* ===== DASHBOARD ===== */
let chartPref, chartRating, chartAlasan;

function animateNumber(el, target){
  const start = 0, duration = 700, startTime = performance.now();
  function tick(now){
    const p = Math.min((now - startTime) / duration, 1);
    el.textContent = Math.round(start + (target - start) * p);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function muatData(){
  google.script.run
    .withSuccessHandler(render)
    .withFailureHandler(err => alert('Gagal memuat data: ' + err.message))
    .getSurveyData(SPREADSHEET_URL);
}

function render(data){
  animateNumber(document.getElementById('numTotal'), data.total);
  animateNumber(document.getElementById('numAtas'), data.atas);
  animateNumber(document.getElementById('numBawah'), data.bawah);
  document.getElementById('numRating').textContent = data.avgRatingAtas + ' / ' + data.avgRatingBawah;

  const banner = document.getElementById('winnerBanner');
  if (data.total === 0){
    banner.textContent = 'Belum ada data masuk. Sebarkan borangnya dulu yuk! 📣';
  } else if (data.atas === data.bawah){
    banner.textContent = '⚖️ Seri! Parkiran Atas dan Bawah sama-sama disukai.';
  } else {
    const menang = data.atas > data.bawah ? 'Atas' : 'Bawah';
    const persen = Math.round(Math.max(data.atas, data.bawah) / data.total * 100);
    banner.textContent = '🏆 Parkiran ' + menang + ' lebih disukai (' + persen + '% suara)';
  }

  const ctx1 = document.getElementById('chartPref');
  const cfg1 = {
    type:'doughnut',
    data:{labels:['Parkiran Atas','Parkiran Bawah'],
      datasets:[{data:[data.atas, data.bawah], backgroundColor:['#FFD966','#FF8FB1'], borderWidth:0}]},
    options:{plugins:{legend:{position:'bottom', labels:{font:{family:'Nunito'}}}}, animation:{animateScale:true}}
  };
  if(chartPref) chartPref.destroy();
  chartPref = new Chart(ctx1, cfg1);

  const ctx2 = document.getElementById('chartRating');
  const cfg2 = {
    type:'bar',
    data:{labels:['Parkiran Atas','Parkiran Bawah'],
      datasets:[{data:[data.avgRatingAtas, data.avgRatingBawah], backgroundColor:['#FFD966','#FF8FB1'], borderRadius:10}]},
    options:{scales:{y:{beginAtZero:true, max:5}}, plugins:{legend:{display:false}}}
  };
  if(chartRating) chartRating.destroy();
  chartRating = new Chart(ctx2, cfg2);

  const labels = Object.keys(data.alasanCount);
  const values = Object.values(data.alasanCount);
  const ctx3 = document.getElementById('chartAlasan');
  const cfg3 = {
    type:'bar',
    data:{labels:labels, datasets:[{data:values, backgroundColor:'#E86A93', borderRadius:8}]},
    options:{indexAxis:'y', plugins:{legend:{display:false}}, scales:{x:{beginAtZero:true, ticks:{precision:0}}}}
  };
  if(chartAlasan) chartAlasan.destroy();
  chartAlasan = new Chart(ctx3, cfg3);

  const box = document.getElementById('commentList');
  if (data.terbaru.length === 0){
    box.innerHTML = '<div class="empty">Belum ada masukan.</div>';
  } else {
    box.innerHTML = data.terbaru.map(t =>
      '<div class="comment"><b>' + (t.nama || 'Anonim') + '</b> (pilih ' + t.preferensi + '): ' + t.saran + '</div>'
    ).join('');
  }
}
