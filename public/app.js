const $ = s => document.querySelector(s);
let scenario = 'approved';
const clear = () => {
  $('#result').className = 'result neutral';
  $('#result strong').textContent = 'Ready for review';
  $('#result p').textContent = 'Evaluate to see how the current policy applies.';
  $('#result .result-icon').textContent = '↳';
  $('#public-decision').textContent = 'Awaiting evaluation';
  $('#public-commitment').textContent = '—';
  $('#public-expiry').textContent = '—';
};
document.querySelectorAll('.invoice').forEach(button => button.addEventListener('click', () => {
  scenario = button.dataset.scenario;
  document.querySelectorAll('.invoice').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
  clear();
}));
$('#limit').addEventListener('input', () => { $('#limit-value').textContent = '$' + Number($('#limit').value).toLocaleString('en-US'); clear(); });
$('#evaluate').addEventListener('click', async () => {
  const button = $('#evaluate');
  button.disabled = true;
  document.querySelectorAll('.invoice, #limit').forEach(el => { el.disabled = true; });
  try {
    const response = await fetch('/api/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario, limit: Number($('#limit').value) }) });
    if (!response.ok) throw new Error('Preview unavailable. Please try again.');
    const data = await response.json();
    $('#result').className = `result ${data.approved ? 'approved' : 'rejected'}`;
    $('#result .result-icon').textContent = data.approved ? '✓' : '×';
    $('#result strong').textContent = data.approved ? 'Approved by the preview policy' : 'Rejected by the preview policy';
    $('#result p').textContent = data.approved ? 'Vendor, payment details, budget and expiry pass. No payment was sent.' : data.reasons.join(' · ');
    $('#public-decision').textContent = data.approved ? 'APPROVE (preview)' : 'REJECT (preview)';
    $('#public-commitment').textContent = data.commitment;
    $('#public-commitment').title = data.commitment;
    $('#public-expiry').textContent = new Date(data.publicFields.expiresAt * 1000).toISOString().replace('T', ' ').replace('.000Z', ' UTC');
  } catch (error) {
    $('#result').className = 'result rejected';
    $('#result strong').textContent = 'Preview could not run';
    $('#result p').textContent = error.message;
  } finally { button.disabled = false; document.querySelectorAll('.invoice, #limit').forEach(el => { el.disabled = false; }); }
});
try {
  const response = await fetch('/evidence.json');
  if (!response.ok) throw new Error();
  const data = await response.json();
  $('#execution-status').textContent = data.runs.length ? data.runs.map(run => `${run.success ? '✓' : '×'} ${run.scenario}: ${run.approved ? 'APPROVE' : 'REJECT'}\n  ${run.recordedAt}`).join('\n\n') : 'Project simulation evidence pending.\nOfficial starter smoke test passed.';
} catch { $('#execution-status').textContent = 'Evidence unavailable.\nInspect the repository for recorded logs.'; }
