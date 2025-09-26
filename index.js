// 네비게이션 스크롤 이동
function scrollToSection(id) {
  const section = document.getElementById(id);
  if (section) section.scrollIntoView({ behavior: 'smooth' });
}
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    const target = this.getAttribute('href').replace('#', '');
    scrollToSection(target);
  });
});

// 맨위로 버튼
const toTopBtn = document.getElementById('toTopBtn');
window.onscroll = function() {
  if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
    toTopBtn.style.display = 'block';
  } else {
    toTopBtn.style.display = 'none';
  }
};
toTopBtn.onclick = function() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 관리자 로그인
const adminId = 'admin';
const adminPw = '1234';
document.getElementById('adminLoginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const id = document.getElementById('adminId').value.trim();
  const pw = document.getElementById('adminPw').value.trim();
  if (id === adminId && pw === adminPw) {
    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('admin-panel').style.display = '';
    renderOrders();
    renderLockers();
    renderInquiries();
    renderStats();
    renderPushTargetOptions();
  } else {
    alert('로그인 실패!');
  }
});

// 락커 데이터
const lockers = [
  { number: 101, status: '비어 있음', member: '', password: '', isOpen: false },
  { number: 102, status: '비어 있음', member: '', password: '', isOpen: false },
  { number: 103, status: '비어 있음', member: '', password: '', isOpen: false }
];

// 주문 데이터
let orderSeq = 1;
const orders = [
  { id: orderSeq++, customer: '김태현', phone: '010-1234-5678', seat: 'A12', locker: 101, menu: '떡볶이', quantity: 2, price: 18000, payment: '완료', status: '대기', pw: '', request: '케첩 추가' },
  { id: orderSeq++, customer: '임우진', phone: '010-5678-1234', seat: 'B5', locker: 102, menu: '피자', quantity: 1, price: 15000, payment: '대기', status: '대기', pw: '', request: '' },
  { id: orderSeq++, customer: '조용준', phone: '010-1234-5678', seat: 'A12', locker: 101, menu: '치킨', quantity: 2, price: 18000, payment: '완료', status: '대기', pw: '', request: '케첩 추가' },
  { id: orderSeq++, customer: '하다민', phone: '010-5678-1234', seat: 'B5', locker: 102, menu: '햄버거', quantity: 1, price: 15000, payment: '대기', status: '대기', pw: '', request: '' }
  
];

// 문의 데이터
let inquirySeq = 1;
const inquiries = [
  { id: inquirySeq++, customer: '홍길동', phone: '010-1234-5678', content: '락커가 안 열려요', time: '2025-09-26 12:30', status: '미처리', answer: '' },
  { id: inquirySeq++, customer: '김철수', phone: '010-5678-1234', content: '주문 취소하고 싶어요', time: '2025-09-26 12:45', status: '미처리', answer: '' }
];

// 주문/락커/문의/통계 주기적 갱신
function refreshAll() {
  renderOrders();
  renderLockers();
  renderInquiries();
  renderStats();
  renderPushTargetOptions(); // 고객 목록 갱신
}
setInterval(refreshAll, 3000);

// 주문 관리
function renderOrders() {
  const tbody = document.querySelector('#ordersTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  orders.forEach(order => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${order.id}</td>
      <td>${order.customer}</td>
      <td>${order.phone}</td>
      <td>${order.seat}</td>
      <td>${order.locker}</td>
      <td>${order.menu}</td>
      <td>${order.quantity}</td>
      <td>${order.price.toLocaleString()}원</td>
      <td>${order.payment}</td>
      <td>${order.status}</td>
      <td>
        <button onclick="showOrderDetail(${order.id})">상세</button>
        ${(order.status === '대기' && order.payment === '완료') ? `<button onclick="acceptOrder(${order.id})">수락/비밀번호 배정</button>` : ''}
        ${order.status === '배정' ? `<button onclick="changeOrderStatus(${order.id}, '조리중')">조리중</button>` : ''}
        ${order.status === '조리중' ? `<button onclick="changeOrderStatus(${order.id}, '완료')">완료</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
}
window.acceptOrder = function(orderId) {
  const order = orders.find(o => o.id === orderId);
  const locker = lockers.find(l => l.number === order.locker);
  if (locker && locker.status === '비어 있음') {
    locker.status = '사용 중';
    locker.member = order.customer;
    locker.password = String(Math.floor(1000 + Math.random() * 9000));
    locker.isOpen = false;
    order.status = '배정';
    order.pw = locker.password;
    alert(`락커 ${locker.number}에 비밀번호 ${locker.password}가 배정되었습니다!`);
    sendPushNotification('주문 수락', `주문이 수락되었습니다. 락커 비밀번호: ${locker.password}`, order.customer);
    renderOrders();
    renderLockers();
    renderPushTargetOptions();
  } else {
    alert('이미 사용 중인 락커입니다.');
  }
};
window.changeOrderStatus = function(orderId, status) {
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = status;
    sendPushNotification('주문 상태 변경', `주문이 '${status}' 상태로 변경되었습니다.`, order.customer);
    renderOrders();
  }
};
window.showOrderDetail = function(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (order) {
    alert(`주문 상세\n고객명: ${order.customer}\n연락처: ${order.phone}\n좌석: ${order.seat}\n락커: ${order.locker}\n메뉴: ${order.menu}\n수량: ${order.quantity}\n가격: ${order.price}원\n결제: ${order.payment}\n요청사항: ${order.request}`);
  }
};

// 락커 관리
function renderLockers() {
  const tbody = document.querySelector('#lockerTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  lockers.forEach(locker => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${locker.number}</td>
      <td>${locker.status}</td>
      <td>${locker.member}</td>
      <td>${locker.status === '사용 중' ? locker.password : ''}</td>
      <td>${locker.status === '사용 중' ? (locker.isOpen ? '열림' : '닫힘') : '-'}</td>
      <td>${locker.status === '사용 중' ? `<button onclick="releaseLocker(${locker.number})">회수</button>` : ''}</td>
    `;
    tbody.appendChild(tr);
  });
}
window.releaseLocker = function(lockerNumber) {
  const locker = lockers.find(l => l.number === lockerNumber);
  if (locker && locker.status === '사용 중') {
    locker.status = '비어 있음';
    locker.member = '';
    locker.password = '';
    locker.isOpen = false;
    renderLockers();
    renderPushTargetOptions();
  }
};

// 문의 관리 (답장 기능 포함)
function renderInquiries() {
  const tbody = document.querySelector('#inquiryTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  inquiries.forEach(inq => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${inq.id}</td>
      <td>${inq.customer}</td>
      <td>${inq.phone}</td>
      <td>${inq.content}</td>
      <td>${inq.time}</td>
      <td>${inq.answer ? inq.answer : ''}</td>
      <td>
        ${inq.status === '미처리' ? `<button onclick="showAnswerForm(${inq.id})">답장</button>` : '처리완료'}
      </td>
    `;
    tbody.appendChild(tr);
  });
}
window.showAnswerForm = function(id) {
  const answer = prompt('답변 내용을 입력하세요:');
  if (answer !== null && answer.trim() !== '') {
    const inq = inquiries.find(i => i.id === id);
    if (inq) {
      inq.answer = answer;
      inq.status = '처리완료';
      alert('답변이 등록되었습니다!');
      renderInquiries();
    }
  }
};

// 주문/매출 통계
function renderStats() {
  const totalOrdersEl = document.getElementById('totalOrders');
  const totalSalesEl = document.getElementById('totalSales');
  const menuStats = document.getElementById('menuStats');
  if (!totalOrdersEl || !totalSalesEl || !menuStats) return;
  totalOrdersEl.textContent = orders.length;
  const totalSales = orders.reduce((sum, o) => sum + (o.payment === '완료' ? o.price : 0), 0);
  totalSalesEl.textContent = totalSales.toLocaleString();
  const menuCount = {};
  orders.forEach(o => {
    menuCount[o.menu] = (menuCount[o.menu] || 0) + 1;
  });
  menuStats.innerHTML = '';
  Object.keys(menuCount).forEach(menu => {
    const li = document.createElement('li');
    li.textContent = `${menu}: ${menuCount[menu]}건`;
    menuStats.appendChild(li);
  });
}

// 고객명 목록 추출 함수
function getCustomerNames() {
  const names = orders.map(o => o.customer);
  return Array.from(new Set(names));
}

// 푸시 대상 select 동적 생성 (선택값 유지)
function renderPushTargetOptions() {
  const select = document.getElementById('pushTarget');
  if (!select) return;
  // 현재 선택된 값 저장
  const prevValue = select.value;
  select.innerHTML = '';
  // 안내용 option 추가
  const optionGuide = document.createElement('option');
  optionGuide.value = '';
  optionGuide.textContent = '이름을 선택하세요';
  optionGuide.disabled = true;
  select.appendChild(optionGuide);
  // 실제 옵션 추가
  const targets = [
    { value: 'all', label: '전체' },
    { value: 'admin', label: '관리자' },
    ...getCustomerNames().map(name => ({ value: name, label: name }))
  ];
  targets.forEach(t => {
    const option = document.createElement('option');
    option.value = t.value;
    option.textContent = t.label;
    select.appendChild(option);
  });
  // 이전 선택값 복원 (옵션이 있으면)
  if (prevValue && select.querySelector(`option[value='${prevValue}']`)) {
    select.value = prevValue;
  } else {
    select.value = '';
  }
}

// 푸시 알림 예시 클릭 시 자동 입력
Array.from(document.getElementsByClassName('push-example')).forEach(function(el) {
  el.addEventListener('click', function() {
    const pushTitleEl = document.getElementById('pushTitle');
    const pushBodyEl = document.getElementById('pushBody');
    if (!pushTitleEl || !pushBodyEl) return;
    pushTitleEl.value = el.getAttribute('data-title');
    pushBodyEl.value = el.getAttribute('data-body');
  });
});

// 푸시 알림 (브라우저 알림)
function sendPushNotification(title, body, target = 'all') {
  // 실제 서비스에서는 target에 따라 서버에 요청하거나, 특정 사용자에게만 알림 전송
  console.log(`알림 대상: ${target}`);
  if (!('Notification' in window)) {
    alert('이 브라우저는 알림을 지원하지 않습니다.');
    return;
  }
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, { body });
      } else {
        alert('알림 권한이 거부되었습니다.');
      }
    });
  } else {
    alert('알림 권한이 거부되었습니다.');
  }
}
const pushFormEl = document.getElementById('pushForm');
if (pushFormEl) {
  pushFormEl.addEventListener('submit', function(e) {
    e.preventDefault();
    const target = document.getElementById('pushTarget').value;
    const title = document.getElementById('pushTitle').value.trim();
    const body = document.getElementById('pushBody').value.trim();
    // 입력값 검사
    if (!target) {
      alert('이름을 선택해주세요');
      return;
    }
    if (!title) {
      alert('알림 제목을 입력해주세요');
      return;
    }
    if (!body) {
      alert('알림 내용을 입력해주세요');
      return;
    }
    sendPushNotification(title, body, target);
    alert('전송했습니다');
    pushFormEl.reset();
    renderPushTargetOptions(); // 폼 리셋 후 select 안내용 옵션으로 초기화
  });
}
