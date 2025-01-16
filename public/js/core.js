let mediaRecorder;
let audioChunks = [];
let startTime = null;
let timerInterval = null;
let elapsedTime = 0;

const recordButton = document.getElementById('recordButton');
const stopButton = document.getElementById('stopButton');
const recordingList = document.getElementById('recordingList');
const recordingsDom = document.getElementById('recordings');
const previousRecordingsButton = document.getElementById('previousButton');
const calendarContainer = document.getElementById('calendarDiv');
const mainRecorder = document.getElementById('mainRecorder');


previousRecordingsButton.addEventListener('click', () => {
  recordingsDom.style.display = recordingsDom.style.display === 'none' ? 'block' : 'none';
  mainRecorder.style.display = mainRecorder.style.display === 'none' ? 'flex' : 'none';
});

recordButton.addEventListener('click', async () => {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = event => {
      audioChunks.push(event.data);
    };
    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      const fileName = `recording-${Date.now()}.webm`;
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64data = reader.result;
        fetch('./save-recording', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioData: base64data, fileName }),
        }).then(response => {
          if (response.ok) {
            updateRecordingList();
          }
        });
      };
    };
  }
  
  if (mediaRecorder.state === 'inactive') {
    mediaRecorder.start();
    startTime = Date.now();
    timerInterval = setInterval(updateTime, 1000);
    recordButton.classList.add('isRecording');
    stopButton.disabled = false;
  } else if (mediaRecorder.state === 'recording') {
    mediaRecorder.pause();
    clearInterval(timerInterval);
    recordButton.classList.remove('isRecording');
    recordButton.innerHTML = '<span class="pauseStripe"></span><span class="pauseStripe me-0"></span>';
  } else {
    mediaRecorder.resume();
    startTime = Date.now() - elapsedTime;
    timerInterval = setInterval(updateTime, 1000);
    recordButton.classList.add('isRecording');
    recordButton.innerHTML = '<span class="recordDot"></span>';
  }
});

function updateTime() {
  elapsedTime = Date.now() - startTime;
  const minutes = Math.floor(elapsedTime / 60000);
  const seconds = Math.floor((elapsedTime % 60000) / 1000);
  document.getElementById('recordingTime').textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// Stop button
stopButton.addEventListener('click', () => {
  // Stop the media recorder
  mediaRecorder.stop();
  
  // Reset the timer interval
  clearInterval(timerInterval);
  document.getElementById('recordingTime').textContent = "0:00";

  // Reset button to the initial state
  recordButton.classList.remove('isRecording');
  recordButton.innerHTML = '<span class="recordDot"></span>';
  
  // Hide the Stop button
  stopButton.disabled = true;

  // Clear the audiocunks
  audioChunks = [];
});


async function updateRecordingList() {
  // Fetch recordings grouped by date
  fetch('./list-recordings')
    .then(response => response.json())
    .then(data => {
      calendarContainer.innerHTML = '';
      // Initialize the calendar with highlighted dates
      const calendar = new Pikaday({
        field: previousRecordingsButton,
        container: calendarContainer,
        onSelect: (date) => {
          // Fix add day to it
          date.setDate(date.getDate() + 1); 
          const selectedDate = date.toISOString().split('T')[0];
          const recordings = data[selectedDate] || [];
          displayRecordingsForDate(selectedDate, recordings);

          calendar.show();
        },
        onClose: () => {
          // Prevent closing
          calendar.show();
        }
      });
    });
}

updateRecordingList();





function displayRecordingsForDate(date, recordings) {
  recordingList.innerHTML = `<h3>Recordings for ${date}</h3>`;
  let i = 0;

  // If no recordings
  if(recordings.length == 0) {
    const listItem = document.createElement('div');
    listItem.textContent = `No recordings`;
    recordingList.appendChild(listItem);
  }

  recordings.forEach(({ fileName, date }) => {
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = `./recordings/${fileName}`;
    const listItem = document.createElement('div');

    const dateNew = new Date(date);
    const hours = dateNew.getHours() % 12 || 12;
    const minutes = dateNew.getMinutes().toString().padStart(2, '0');
    const ampm = dateNew.getHours() >= 12 ? 'PM' : 'AM';
    
    const formattedTime = `${hours}:${minutes} ${ampm}`;

    listItem.textContent = `Recorded at ${formattedTime}`;
    listItem.appendChild(audio);
    audio.style.width = '100%';
    audio.style.marginTop = '6px';

    if(!(recordings.length-1 == i)) {
      const hr = document.createElement('hr');
      listItem.appendChild(hr);
    }

    i++

    recordingList.appendChild(listItem);
  });
}
