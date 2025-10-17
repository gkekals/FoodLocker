/***************************************************
 * 🌟 기본 UI 기능
 ***************************************************/
function scrollToSection(id) {
  const section = document.getElementById(id);
  if (section) section.scrollIntoView({ behavior: 'smooth' });
}
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', function (e) {
    e.preventDefault();
    const target = this.getAttribute('href').replace('#', '');
    scrollToSection(target);
  });
});

// 맨 위로 버튼
const toTopBtn = document.getElementById('toTopBtn');
window.onscroll = function () {
  toTopBtn.style.display =
    document.body.scrollTop > 200 || document.documentElement.scrollTop > 200
      ? 'block'
      : 'none';
};
toTopBtn.onclick = function () {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/***************************************************
 * 🌟 관리자 로그인
 ***************************************************/
const adminId = 'admin';
const adminPw = '1234';
document.getElementById('adminLoginForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const id = document.getElementById('adminId').value.trim();
  const pw = document.getElementById('adminPw').value.trim();
  if (id === adminId && pw === adminPw) {
    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('admin-panel').style.display = '';
    startFirebaseRealtimeOrders();
    renderLockers();
    renderInquiries();
    renderPushTargetOptions();
  } else {
    alert('로그인 실패!');
  }
});

/***************************************************
 * 🌟 Firebase 연결
 ***************************************************/
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc   // ✅ Firestore 삭제 기능 추가
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDT_Au5Kk56pyaK6fR9SqtV9Ta0_hU",
  authDomain: "ball-lock-v2.firebaseapp.com",
  projectId: "ball-lock-v2",
  storageBucket: "ball-lock-v2.appspot.com",
  messagingSenderId: "1919983702313",
  appId: "1:1919983702313:web:fd52c81f5ada147106f738",
  measurementId: "G-7M07TKZ5F"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/***************************************************
 * ▼▼▼ 여기! 전역 푸시 대상 집합 선언(중복 선언 금지) ▼▼▼
 ***************************************************/
const pushTargets = new Set(['all', 'admin']); // 기본 대상
/***************************************************
 * 🌟 락커 데이터 (공유)
 ***************************************************/
const lockers = [
  { number: 101, status: '비어 있음', member: '', password: '', isOpen: false },
  { number: 102, status: '비어 있음', member: '', password: '', isOpen: false },
  { number: 103, status: '비어 있음', member: '', password: '', isOpen: false },
];

/***************************************************
 * 🌟 Firestore 실시간 주문
 ***************************************************/
function startFirebaseRealtimeOrders() {
  const tbody = document.querySelector('#ordersTable tbody');
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));

  // startFirebaseRealtimeOrders 내부 onSnapshot 콜백을 아래처럼 보강
onSnapshot(q, (snapshot) => {
  tbody.innerHTML = "";
  const names = new Set(['all', 'admin']);

  snapshot.forEach((docSnap) => {
    const o = docSnap.data();

    // 1) 주문 고객명 수집
    const n1 = (o.customerName || o.user || o.name || '').trim();
    if (n1) names.add(n1);

    // 2) 락커 배정 고객명 수집(배정 이후에도 선택 가능하도록)
    const n2 = (o.assignedTo || o.member || o.customerName || '').trim();
    if (n2) names.add(n2);

    // 테이블 렌더
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${o.orderId || docSnap.id.slice(-5)}</td>
      <td>${o.customerName || '-'}</td>
      <td>${o.phone || '-'}</td>
      <td>${o.seat || '-'}</td>
      <td>${o.locker || '-'}</td>
      <td>${o.menu || '-'}</td>
      <td>${o.quantity || '-'}</td>
      <td>${o.price ? o.price.toLocaleString() + '원' : '-'}</td>
      <td>${o.payment || '-'}</td>
      <td>${o.status || '-'}</td>
      <td id="btns-${docSnap.id}">${renderOrderButtons(docSnap.id, o)}</td>
    `;
    tbody.appendChild(tr);
  });

  // 전역 집합 갱신 후 대상 셀렉트 렌더
  pushTargets.clear();
  names.forEach(n => pushTargets.add(n));
  renderPushTargetOptions();
});

}

/***************************************************
 * 🌟 버튼 렌더링 및 이벤트
 ***************************************************/
function renderOrderButtons(id, order) {
  if (order.status === '대기' && order.payment === '완료') {
    return `
      <button onclick="showOrderDetail('${id}')">상세</button>
      <button onclick="assignLocker('${id}', '${order.customerName}')">수락/비밀번호 배정</button>
    `;
  } else if (order.status === '배정') {
    return `
      <button onclick="showOrderDetail('${id}')">상세</button>
      <button onclick="changeOrderStatus('${id}', '조리중')">조리중</button>
    `;
  } else if (order.status === '조리중') {
    return `
      <button onclick="showOrderDetail('${id}')">상세</button>
      <button onclick="changeOrderStatus('${id}', '완료')">완료</button>
    `;
  } 
  // ✅ 완료 상태인 경우 “상세” + “비우기” 버튼 표시
  else if (order.status === '완료') {
    return `
      <button onclick="showOrderDetail('${id}')">상세</button>
      <button onclick="deleteOrder('${id}')">비우기</button>
    `;
  } else {
    return `<button onclick="showOrderDetail('${id}')">상세</button>`;
  }
}

/***************************************************
 * 🌟 주문 상세보기 / 상태변경 / 수락 기능
 ***************************************************/
window.showOrderDetail = function (id) {
  alert(`주문 상세\n\n(주문 ID: ${id})`);
};

// ✅ 락커 수락/배정
window.assignLocker = async function (orderId, customerName) {
  const lockerInput = prompt('배정할 락커 번호를 입력하세요 (예: 101, 102 등):');
  if (!lockerInput || isNaN(lockerInput)) {
    alert('유효한 락커 번호를 입력해주세요.');
    return;
  }

  const locker = lockers.find((l) => l.number == lockerInput);
  if (!locker) {
    alert('해당 락커 번호는 존재하지 않습니다.');
    return;
  }
  if (locker.status === '사용 중') {
    alert('이미 사용 중인 락커입니다.');
    return;
  }

  const password = String(Math.floor(1000 + Math.random() * 9000));
  alert(`락커 ${lockerInput}번에 비밀번호 ${password}가 배정되었습니다!`);

  const orderRef = doc(db, "orders", orderId);
  await updateDoc(orderRef, {
    status: "배정",
    locker: lockerInput,
    lockerPassword: password
  });

  locker.status = '사용 중';
  locker.member = customerName;
  locker.password = password;
  locker.isOpen = false;
  renderLockers();

  const btnCell = document.getElementById(`btns-${orderId}`);
  if (btnCell) {
    btnCell.innerHTML = `
      <button onclick="showOrderDetail('${orderId}')">상세</button>
      <button onclick="changeOrderStatus('${orderId}', '조리중')">조리중</button>
    `;
  }
  const row = btnCell.closest('tr');
  if (row) row.cells[9].textContent = '배정';
};

// ✅ 주문 상태 변경
window.changeOrderStatus = async function (orderId, newStatus) {
  const btnCell = document.getElementById(`btns-${orderId}`);
  if (!btnCell) return;
  const row = btnCell.closest('tr');
  if (row) row.cells[9].textContent = newStatus;

  const orderRef = doc(db, "orders", orderId);
  await updateDoc(orderRef, { status: newStatus });

  if (newStatus === '조리중') {
    btnCell.innerHTML = `
      <button onclick="showOrderDetail('${orderId}')">상세</button>
      <button onclick="changeOrderStatus('${orderId}', '완료')">완료</button>
    `;
  } else if (newStatus === '완료') {
    // ✅ 완료 시 “상세 + 비우기” 버튼 표시
    btnCell.innerHTML = `
      <button onclick="showOrderDetail('${orderId}')">상세</button>
      <button onclick="deleteOrder('${orderId}')">비우기</button>
    `;
  }

  alert(`주문 상태가 '${newStatus}'로 변경되었습니다.`);
};

/***************************************************
 * 🌟 주문 비우기 (Firestore 삭제)
 ***************************************************/
window.deleteOrder = async function (orderId) {
  const confirmDelete = confirm("이 주문을 삭제하시겠습니까?");
  if (!confirmDelete) return;

  try {
    await deleteDoc(doc(db, "orders", orderId));
    alert("주문이 삭제되었습니다 ✅");
  } catch (err) {
    console.error("삭제 오류:", err);
    alert("주문 삭제 중 오류가 발생했습니다.");
  }
};

/***************************************************
 * 🌟 락커 관리
 ***************************************************/
function renderLockers() {
  const tbody = document.querySelector('#lockerTable tbody');
  tbody.innerHTML = '';
  lockers.forEach((locker) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${locker.number}</td>
      <td>${locker.status}</td>
      <td>${locker.member}</td>
      <td>${locker.password || ''}</td>
      <td>${locker.isOpen ? '열림' : locker.status === '사용 중' ? '닫힘' : '-'}</td>
      <td>${
        locker.status === '사용 중'
          ? `<button onclick="releaseLocker(${locker.number})">회수</button>`
          : ''
      }</td>
    `;
    tbody.appendChild(tr);
  });
}

window.releaseLocker = function (lockerNum) {
  const locker = lockers.find((l) => l.number === lockerNum);
  if (locker) {
    locker.status = '비어 있음';
    locker.member = '';
    locker.password = '';
    locker.isOpen = false;
    renderLockers();
  }
};

/***************************************************
 * 🌟 문의 관리 / 푸시 알림
 ***************************************************/
let inquirySeq = 1;
const inquiries = [
  { id: inquirySeq++, customer: '홍길동', phone: '010-1234-5678', content: '락커가 안 열려요', time: '2025-09-26 12:30', status: '미처리', answer: '' },
  { id: inquirySeq++, customer: '김철수', phone: '010-5678-1234', content: '주문 취소하고 싶어요', time: '2025-09-26 12:45', status: '미처리', answer: '' }
];

function renderInquiries() {
  const tbody = document.querySelector('#inquiryTable tbody');
  tbody.innerHTML = '';
  inquiries.forEach(inq => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${inq.id}</td>
      <td>${inq.customer}</td>
      <td>${inq.phone}</td>
      <td>${inq.content}</td>
      <td>${inq.time}</td>
      <td>${inq.answer}</td>
      <td>${inq.status === '미처리' ? `<button onclick="showAnswerForm(${inq.id})">답장</button>` : '처리완료'}</td>
    `;
    tbody.appendChild(tr);
  });
}
window.showAnswerForm = function (id) {
  const inq = inquiries.find(i => i.id === id);
  const answer = prompt('답변 내용을 입력하세요:');
  if (answer) {
    inq.answer = answer;
    inq.status = '처리완료';
    renderInquiries();
  }
};

// renderPushTargetOptions를 '집합 기반'으로 교체
function renderPushTargetOptions() {
  const select = document.getElementById('pushTarget');
  if (!select) return;
  const prev = select.value;

  select.innerHTML = '';
  const guide = document.createElement('option');
  guide.value = '';
  guide.textContent = '이름을 선택하세요';
  guide.disabled = true;
  select.appendChild(guide);

  [...pushTargets].forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  });

  if (prev && [...pushTargets].includes(prev)) select.value = prev;
  else select.value = 'all';
}

window.addEventListener('DOMContentLoaded', () => { renderPushTargetOptions?.(); });

window.addEventListener('DOMContentLoaded', () => {
  const examples = document.querySelectorAll('.push-example');
  const titleInput = document.getElementById('pushTitle');
  const bodyInput  = document.getElementById('pushBody');
  const targetSel  = document.getElementById('pushTarget');

  if (!examples.length || !titleInput || !bodyInput || !targetSel) return;

  examples.forEach((el) => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => {
      const t = el.getAttribute('data-title') || '';
      const b = el.getAttribute('data-body')  || '';
      titleInput.value = t;
      bodyInput.value  = b;
      if (!targetSel.value) targetSel.value = 'all';
      el.animate([{ backgroundColor: '#fffae6' }, { backgroundColor: 'transparent' }], { duration: 500 });
    });
  });
});

window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('pushForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (sessionStorage.getItem('isAdmin') === '1') {
    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('admin-panel').style.display = '';
  }

  const target = document.getElementById('pushTarget')?.value?.trim();
  const title  = document.getElementById('pushTitle')?.value?.trim();
  const body   = document.getElementById('pushBody')?.value?.trim();
  if (!target || !title || !body) return alert('대상/제목/내용을 모두 입력하세요.');

  try {
    const res = await fetch('https://<region>-<project-id>.cloudfunctions.net/sendPush', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, title, body })
    });
    if (!res.ok) throw new Error(await res.text());
    alert('알림이 전송되었습니다.');
  } catch (e2) {
    console.error(e2);
    alert('알림 전송 실패: 서버/토큰/권한을 확인하세요.');
  }
});

});
