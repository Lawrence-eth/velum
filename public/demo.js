const video = document.querySelector('#demo-video');
const status = document.querySelector('#video-status');
let chapterSource;
function loadChapterSource() {
  if (!chapterSource) chapterSource = fetch('/velum-demo.mp4').then(response => {
    if (!response.ok) throw new Error('Video unavailable');
    return response.blob();
  }).then(blob => {
    video.src = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
      video.addEventListener('loadedmetadata', resolve, { once: true });
      video.addEventListener('error', reject, { once: true });
      video.load();
    });
  }).catch(error => { chapterSource = undefined; throw error; });
  return chapterSource;
}
for (const button of document.querySelectorAll('[data-time]')) {
  button.addEventListener('click', async () => {
    try {
      status.textContent = 'Loading the walkthrough…';
      await loadChapterSource();
      video.currentTime = Number(button.dataset.time);
      await video.play();
      status.textContent = '';
      video.scrollIntoView({ block: 'center' });
    } catch {
      status.textContent = 'Use the video play button to start the walkthrough, or download the MP4.';
    }
  });
}
video.addEventListener('error', () => { status.textContent = 'The video could not load. Download the MP4 or open the live workspace below.'; });
