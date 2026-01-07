const textArea = document.getElementById('text-input');
const coordInput = document.getElementById('coord');
const valInput = document.getElementById('val');
const errorMsg = document.getElementById('error');

document.addEventListener('DOMContentLoaded', () => {
  textArea.value =
    '..9..5.1.85.4....2432......1...69.83.9.....6.62.71...9......1945....4.37.4.3..6..';
  fillpuzzle(textArea.value);
});

textArea.addEventListener('input', () => {
  fillpuzzle(textArea.value);
});

function fillpuzzle(data) {
  let len = data.length < 81 ? data.length : 81;
  for (let i = 0; i < len; i++) {
    let rowLetter = String.fromCharCode('A'.charCodeAt(0) + Math.floor(i / 9));
    let col = (i % 9) + 1;
    if (!data[i] || data[i] === '.') {
      document.getElementsByClassName(rowLetter + col)[0].innerText = ' ';
      continue;
    }
    document.getElementsByClassName(rowLetter + col)[0].innerText = data[i];
  }
  return;
}

async function getSolved() {
  const stuff = { puzzle: textArea.value };
  const data = await fetch('/api/solve', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-type': 'application/json'
    },
    body: JSON.stringify(stuff)
  });
  const parsed = await data.json();
  if (parsed.error) {
    errorMsg.innerHTML = `<code>${JSON.stringify(parsed, null, 2)}</code>`;
    return;
  }
  fillpuzzle(parsed.solution);
}

async function getChecked() {
  // Validate that required fields are filled
  const missingFields = [];
  if (!textArea.value.trim()) missingFields.push('puzzle');
  if (!coordInput.value.trim()) missingFields.push('coordinate');
  if (!valInput.value.trim()) missingFields.push('value');
  
  if (missingFields.length > 0) {
    errorMsg.innerHTML = `<code>${JSON.stringify({ error: 'Required field(s) missing', missing: missingFields }, null, 2)}</code>`;
    return;
  }

  const stuff = {
    puzzle: textArea.value.trim(),
    coordinate: coordInput.value.trim(),
    value: valInput.value.trim()
  };
  const data = await fetch('/api/check', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-type': 'application/json'
    },
    body: JSON.stringify(stuff)
  });
  const parsed = await data.json();
  errorMsg.innerHTML = `<code>${JSON.stringify(parsed, null, 2)}</code>`;
}

document.getElementById('solve-button').addEventListener('click', getSolved);
document.getElementById('check-button').addEventListener('click', getChecked);
