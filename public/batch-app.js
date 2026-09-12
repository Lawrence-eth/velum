const $ = selector => document.querySelector(selector);
const money = value => '$' + (Number(value) / 1e6).toLocaleString('en-US', { maximumFractionDigits: 0 });
let current, perspective = 'operator';
function renderDisclosure() {
  if (!current) return;
  const isPublic = perspective === 'public';
  $('#operator-view').setAttribute('aria-pressed', String(!isPublic));
  $('#public-view').setAttribute('aria-pressed', String(isPublic));
  $('#disclosure-label').textContent = isPublic ? 'PUBLIC REPORT · NO PRIVATE POLICY VALUES' : 'SYNTHETIC OPERATOR VIEW · NOT RELEASED IN THE REPORT';
  $('#disclosure-content').textContent = JSON.stringify(isPublic ? {
    batchId: current.batchId, manifest: current.manifest, decisions: current.publicReceipt,
  } : {
    policyVersion: current.policyVersion,
    invoiceChecks: current.details.map(r => ({ invoice: r.invoiceKey, description: r.label, approved: r.approved, reasons: r.reasons, remainingBudget: money(r.remaining) })),
  }, null, 2);
}
$('#operator-view').addEventListener('click', () => { perspective = 'operator'; renderDisclosure(); });
$('#public-view').addEventListener('click', () => { perspective = 'public'; renderDisclosure(); });
$('#batch-budget').addEventListener('input', () => {
  $('#batch-budget-value').textContent = '$' + Number($('#batch-budget').value).toLocaleString('en-US');
  $('#batch-status').textContent = 'Budget changed. Evaluate again to refresh the preview.';
  current = undefined;
  $('#download-preview').disabled = true;
  for (const id of ['#batch-approved','#batch-isolated','#batch-prevented']) $(id).textContent = '—';
  $('#batch-count').textContent = 'Evaluation needed';
  $('#batch-rows').replaceChildren();
  $('#disclosure-content').textContent = 'Budget changed. Evaluate again.';
});
$('#run-batch').addEventListener('click', async () => {
  $('#run-batch').disabled = true; $('#batch-budget').disabled = true;
  try {
    const response = await fetch('/api/batch-preview?' + new URLSearchParams({ budget: $('#batch-budget').value }));
    if (!response.ok) throw new Error('Batch preview unavailable. Try again.');
    current = await response.json();
    $('#batch-approved').textContent = money(current.approvedAmount);
    $('#batch-isolated').textContent = money(current.isolatedAmount);
    $('#batch-prevented').textContent = money(BigInt(current.isolatedAmount) - BigInt(current.approvedAmount));
    $('#batch-count').textContent = `${current.details.filter(d => d.approved).length} of ${current.details.length} invoices approved`;
    $('#batch-rows').replaceChildren();
    for (const row of current.details) {
      const tr = document.createElement('tr');
      for (const [i, value] of [`${row.invoiceKey} · ${row.label}`, money(row.amount), row.approved ? 'Approved' : 'Held', row.approved ? 'Matched policy; budget reserved' : row.reasons.join(' · ')].entries()) {
        const td = document.createElement('td'); td.textContent = value;
        if (i === 2) td.className = row.approved ? 'approved-text' : 'held-text';
        tr.append(td);
      }
      $('#batch-rows').append(tr);
    }
    $('#batch-status').textContent = 'Preview complete. Same batch policy as CRE; no CRE execution or payment was triggered.';
    $('#download-preview').disabled = false;
    renderDisclosure();
  } catch (error) { $('#batch-status').textContent = error.message; }
  finally { $('#run-batch').disabled = false; $('#batch-budget').disabled = false; }
});
$('#download-preview').addEventListener('click', () => {
  if (!current) return;
  const data = { mode: 'synthetic policy preview — not CRE execution', batchId: current.batchId, manifest: current.manifest, decisions: current.publicReceipt, encodedPayload: current.encodedPayload };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const a = document.createElement('a'); a.href = url; a.download = 'velum-preview-receipt.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
});
try {
  const response = await fetch('/settlement-evidence.json');
  if (!response.ok) throw new Error('Execution receipt unavailable');
  const receipt = await response.json();
  const hex = receipt.report.encodedPayload.slice(2);
  if (!/^(?:[0-9a-f]{2})+$/.test(hex)) throw new Error('Invalid receipt payload');
  const bytes = Uint8Array.from(hex.match(/../g), value => parseInt(value,16));
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  if (hash !== receipt.report.sha256 || !receipt.success) throw new Error('Receipt integrity check failed');
  $('#receipt-integrity').textContent = '✓ Receipt file integrity checked';
  $('#trace-report').textContent = `${bytes.length.toLocaleString()} bytes · SHA-256 ${hash.slice(0,12)}…`;
  $('#trace-paid').textContent = `${receipt.settlements.length} approved payments; ${money(receipt.accounting.paid)} synthetic USD transferred in the local EVM.`;
  $('#balance-before').textContent = money(receipt.accounting.treasuryBefore);
  $('#balance-after').textContent = money(receipt.accounting.treasuryAfter);
  for (const payment of receipt.settlements) {
    const row = document.createElement('div'); row.className = 'settled-row';
    const target = document.createElement('span'); target.textContent = `${payment.recipient.slice(0,8)}…${payment.recipient.slice(-4)}`;
    const amount = document.createElement('strong'); amount.textContent = `+ ${money(payment.amount)}`;
    row.append(target,amount); $('#settled-payments').append(row);
  }
  $('#trace-checks').textContent = `${receipt.checks.length} execution checks passed, including failed-transfer rollback and replay rejection. Recorded ${new Date(receipt.recordedAt).toUTCString()}.`;
} catch (error) {
  $('#receipt-integrity').textContent = 'Evidence not verified';
  $('#trace-report').textContent = error.message;
  $('#trace-paid').textContent = 'Inspect the repository for reproduction steps.';
}

// Recorded testnet transactions are separate from the interactive preview and local tests.
try {
  const response = await fetch('/sepolia-evidence.json');
  if (response.ok) {
    const receipt = await response.json();
    if (receipt.success && receipt.chainId === 11155111 && receipt.settlements.length === 2) {
      $('#sepolia-summary').textContent = `${money(receipt.accounting.paid)} synthetic USD settled across two approved invoices. Three invoices were held. Recorded ${new Date(receipt.recordedAt).toUTCString()}.`;
      const links = [['CRE report delivery', receipt.report.txHash], ...receipt.settlements.map((p, i) => [`Payment ${i + 1}`, p.txHash])];
      for (const [label, hash] of links) {
        if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) throw new Error('Invalid transaction hash');
        const link = document.createElement('a'); link.textContent = `${label} ↗`;
        link.href = `https://sepolia.etherscan.io/tx/${hash}`; link.target = '_blank'; link.rel = 'noreferrer';
        $('#sepolia-links').append(link);
      }
      const download = document.createElement('a'); download.href = '/sepolia-evidence.json'; download.textContent = 'Download testnet receipt ↓'; download.download = 'velum-sepolia-receipt.json';
      $('#sepolia-links').append(download); $('#sepolia-proof').hidden = false;
    }
  }
} catch { /* Leave unverified or unavailable testnet evidence hidden. */ }
