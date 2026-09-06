/* =========================================================
   SolGuard — Shared script.js
   Used across product.html, order.html, and admin.html
   ========================================================= */

const APPS_SCRIPT_URL = '[APPS_SCRIPT_URL]';
const CSV_URL = '[CSV_URL]';

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('product-list')) {
    initProductPage();
  }
  if (document.getElementById('orderForm')) {
    initOrderPage();
  }
  if (document.querySelector('#ordersTable tbody')) {
    initAdminPage();
  }
});

/* ---------------------------------------------------------
   1. product.html — load products, render cards, filter bar
   --------------------------------------------------------- */
function initProductPage() {
  const filterBar = document.getElementById('filter-bar');
  const productList = document.getElementById('product-list');

  const formulas = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'matte', label: 'Matte' },
    { key: 'glow', label: 'Glow' },
    { key: 'sensitive', label: 'Sensitive' },
    { key: 'outdoor', label: 'Outdoor' }
  ];

  const params = new URLSearchParams(window.location.search);
  const initialFormula = params.get('formula') || 'all';

  fetch('products.json')
    .then((res) => res.json())
    .then((products) => {
      renderFilterBar(filterBar, formulas, initialFormula, products, productList);
      renderProductList(productList, filterProducts(products, initialFormula));
    })
    .catch((error) => {
      console.error(error);
      productList.innerHTML = '<p>ไม่สามารถโหลดสินค้าได้ กรุณาลองใหม่อีกครั้ง</p>';
    });
}

function filterProducts(products, formula) {
  if (formula === 'all') return products;
  return products.filter((p) => p.formula === formula);
}

function renderFilterBar(filterBar, formulas, activeFormula, products, productList) {
  filterBar.innerHTML = '';

  formulas.forEach((f) => {
    const btn = document.createElement('button');
    btn.textContent = f.label;
    btn.dataset.formula = f.key;
    if (f.key === activeFormula) btn.classList.add('active');

    btn.addEventListener('click', () => {
      filterBar.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderProductList(productList, filterProducts(products, f.key));
    });

    filterBar.appendChild(btn);
  });
}

function renderProductList(productList, products) {
  productList.innerHTML = '';

  if (products.length === 0) {
    productList.innerHTML = '<p>ไม่พบสินค้าในหมวดนี้</p>';
    return;
  }

  products.forEach((product) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.formula = product.formula;

    const orderUrl = `order.html?item=${encodeURIComponent(product.name)}&price=${encodeURIComponent(product.price)}`;

    card.innerHTML = `
      <div class="product-card__image">
        <img src="${product.image}" alt="${product.name}">
      </div>
      <div class="product-card__body">
        <div class="product-card__formula">${capitalize(product.formula)}</div>
        <h3 class="product-card__name">${product.name}</h3>
        <p class="product-card__desc">${product.size}</p>
        <div class="product-card__footer">
          <span class="product-card__price">฿${product.price}</span>
          <a class="btn btn--primary" href="${orderUrl}">สั่งซื้อ</a>
        </div>
      </div>
    `;

    productList.appendChild(card);
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ---------------------------------------------------------
   2. order.html — prefill from URL params, submit order
   --------------------------------------------------------- */
function initOrderPage() {
  const params = new URLSearchParams(window.location.search);
  const item = params.get('item');
  const price = params.get('price');

  const itemsField = document.getElementById('items');
  const totalField = document.getElementById('total');

  if (item && itemsField) itemsField.value = item;
  if (price && totalField) totalField.value = price;

  const form = document.getElementById('orderForm');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const payload = {
      customerName: document.getElementById('customerName').value,
      contact: document.getElementById('contact').value,
      items: document.getElementById('items').value,
      total: document.getElementById('total').value,
      note: document.getElementById('note').value
    };

    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
      .then(() => {
        window.location.href = 'thankyou.html';
      })
      .catch((error) => {
        console.error(error);
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      });
  });
}

/* ---------------------------------------------------------
   3. admin.html — fetch CSV, parse, render newest-first
   --------------------------------------------------------- */
function initAdminPage() {
  const tbody = document.querySelector('#ordersTable tbody');

  fetch(CSV_URL)
    .then((res) => res.text())
    .then((csvText) => {
      const rows = parseCSV(csvText);
      if (rows.length === 0) return;

      const dataRows = rows.slice(1).reverse();
      renderOrdersTable(tbody, dataRows);
    })
    .catch((error) => {
      console.error(error);
      tbody.innerHTML = '<tr><td colspan="6">ไม่สามารถโหลดข้อมูลได้</td></tr>';
    });
}

function renderOrdersTable(tbody, rows) {
  tbody.innerHTML = '';

  rows.forEach((row) => {
    const tr = document.createElement('tr');
    row.forEach((cell) => {
      const td = document.createElement('td');
      td.textContent = cell;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function parseCSV(csvText) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (char === '\r') {
        // skip, handled by \n
      } else {
        field += char;
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.length > 1 || r[0] !== '');
}
