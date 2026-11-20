class SpeechService {
  private repeatInterval: number | null = null;

  isSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  speak(text: string, lang = 'en', onEnd?: () => void) {
    if (!this.isSupported()) return;

    window.speechSynthesis.cancel(); // Stop any pending utterance

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower, clear cadence for elderly
    utterance.pitch = 1.0;

    // Map language
    if (lang === 'hi') {
      utterance.lang = 'hi-IN';
    } else if (lang === 'te') {
      utterance.lang = 'te-IN';
    } else {
      utterance.lang = 'en-US';
    }

    // Try to match appropriate voice if available
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.lang.startsWith(utterance.lang.substring(0, 2)));
    if (voice) {
      utterance.voice = voice;
    }

    if (onEnd) {
      utterance.onend = onEnd;
    }

    window.speechSynthesis.speak(utterance);
  }

  // Construct friendly reminder speech
  buildReminderSpeech(
    timeStr: string,
    pillColor: string,
    pillShape: string,
    medName: string,
    strength: string,
    instructions: string,
    lang = 'en'
  ): string {
    const formattedFood = instructions.replace('_', ' ');

    if (lang === 'hi') {
      return `यह समय हो गया है। कृपया अपनी ${pillColor} ${pillShape} दवा, ${medName} ${strength} लें। भोजन निर्देश: ${formattedFood}।`;
    }

    if (lang === 'te') {
      return `మందుల సమయం అయింది. దయచేసి మీ ${medName} ${strength} మాత్రను తీసుకోండి।`;
    }

    // Default English
    return `It is ${timeStr}. Please take your ${pillColor} ${pillShape.replace('_', ' ')} medicine, ${medName} ${strength}, ${formattedFood}.`;
  }

  // Start Level 3 repeating voice announcement every 2 minutes
  startRepeatingAnnouncement(speechText: string, lang = 'en') {
    this.stopRepeatingAnnouncement();
    this.speak(speechText, lang);

    this.repeatInterval = window.setInterval(() => {
      this.speak(speechText, lang);
    }, 120000); // 2 minutes
  }

  stopRepeatingAnnouncement() {
    if (this.repeatInterval) {
      clearInterval(this.repeatInterval);
      this.repeatInterval = null;
    }
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
  }

  cancel() {
    this.stopRepeatingAnnouncement();
  }
}

export const speechService = new SpeechService();

