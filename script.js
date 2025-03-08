const dropArea = document.getElementById("drop-area");
const fileInput = document.getElementById("file-input");
const micButton = document.getElementById("mic-button");
const convertButton = document.getElementById("convert-button");
const transcriptionText = document.getElementById("transcription-text");
const downloadButton = document.getElementById("download-button");
const progressContainer = document.getElementById("progress-container");
const progressBar = document.getElementById("progress-bar");

let audioBlob = null;
let mediaRecorder = null;
let chunks = [];
let isRecording = false;

// Open file selector when clicking the drag-and-drop area
dropArea.addEventListener("click", () => fileInput.click());

// Handle file selection
fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file && isValidAudioFile(file)) {
    audioBlob = file;
    dropArea.innerText = file.name;
  } else {
    alert("Please upload an MP3 or WAV file.");
  }
});

// Function to check if the uploaded file is valid
function isValidAudioFile(file) {
  const validTypes = ["audio/mpeg", "audio/wav", "audio/x-wav"];
  return validTypes.includes(file.type);
}

// Microphone functionality
micButton.addEventListener("click", () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("Microphone access is not supported in your browser.");
    return;
  }

  if (isRecording) {
    mediaRecorder.stop();
    isRecording = false;
    micButton.innerText = "🎤 Start Recording";
  } else {
    audioBlob = null;
    dropArea.innerText = "Drop or Select Audio File";

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        const mimeType = MediaRecorder.isTypeSupported("audio/wav") ? "audio/wav" : "audio/webm";
        mediaRecorder = new MediaRecorder(stream, { mimeType });

        chunks = [];
        mediaRecorder.start();
        isRecording = true;
        micButton.innerText = "⏹️ Stop Recording";

        mediaRecorder.ondataavailable = (event) => {
          chunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          audioBlob = blob;
          dropArea.innerText = "Recording.wav";
          alert("Recording saved. You can now convert it.");
          enableDownloadButton();
        };
      })
      .catch((err) => {
        alert("Could not access your microphone. Please check your settings.");
        console.error(err);
      });
  }
});

// Enable the download button
function enableDownloadButton() {
  if (audioBlob) {
    downloadButton.disabled = false;
    downloadButton.addEventListener("click", () => {
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "recording.wav";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      alert("Download started!");
    });
  }
}

// Trigger transcription with progress bar
convertButton.addEventListener("click", async () => {
  if (audioBlob) {
    progressContainer.style.display = "block";
    progressBar.style.width = "0%";

    let progress = 10;
    progressBar.style.width = `${progress}%`;

    const formData = new FormData();
    formData.append("file", audioBlob, "recording.wav");

    try {
      const progressInterval = setInterval(() => {
        if (progress < 80) {
          progress += 10;
          progressBar.style.width = `${progress}%`;
        }
      }, 500);

      const response = await fetch("http://127.0.0.1:5000/transcribe", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      const result = await response.json();

      if (result.transcription) {
        transcriptionText.value = result.transcription;
        progressBar.style.width = "100%";
      } else {
        transcriptionText.value = "Transcription failed. Please try again.";
      }
    } catch (error) {
      transcriptionText.value = "Error: Unable to connect to server.";
      console.error(error);
    }

    setTimeout(() => {
      progressContainer.style.display = "none";
    }, 1000);
    
  } else {
    alert("Please upload an audio file or record audio first.");
  }
});
