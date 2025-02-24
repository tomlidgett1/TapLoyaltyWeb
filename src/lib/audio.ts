export const playSuccessSound = () => {
  try {
    const audio = new Audio('/sounds/success.mp3')
    audio.volume = 0.3
    const playPromise = audio.play()
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Audio is playing
        })
        .catch(error => {
          console.log("Audio playback failed:", error)
        })
    }
  } catch (error) {
    console.log("Error creating audio:", error)
  }
} 