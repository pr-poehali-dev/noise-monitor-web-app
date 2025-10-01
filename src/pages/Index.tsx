import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [isListening, setIsListening] = useState(false);
  const [decibels, setDecibels] = useState(0);
  const [threshold, setThreshold] = useState(30);
  const [isAlert, setIsAlert] = useState(false);
  const [visualBars, setVisualBars] = useState<number[]>(Array(20).fill(0));
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    return () => {
      stopListening();
    };
  }, []);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      microphoneRef.current.connect(analyserRef.current);
      
      setIsListening(true);
      updateAudioLevel();
    } catch (error) {
      console.error('Microphone access denied:', error);
    }
  };

  const stopListening = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current.mediaStream.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
    }
    
    setIsListening(false);
    setDecibels(0);
    setVisualBars(Array(20).fill(0));
  };

  const updateAudioLevel = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const db = Math.round(average * 0.6);
    
    setDecibels(db);
    
    const bars = Array.from({ length: 20 }, (_, i) => {
      const index = Math.floor((i / 20) * dataArray.length);
      return (dataArray[index] / 255) * 100;
    });
    setVisualBars(bars);
    
    if (db > threshold && !isAlert) {
      triggerAlert();
    }
    
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  };

  const triggerAlert = () => {
    setIsAlert(true);
    
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
    
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
    }
    
    alertTimeoutRef.current = setTimeout(() => {
      setIsAlert(false);
    }, 5000);
  };

  return (
    <div className={`min-h-screen transition-all duration-500 ${isAlert ? 'bg-red-600' : 'bg-gradient-to-br from-black via-purple-950 to-black'}`}>
      <div className="container mx-auto px-4 py-8 min-h-screen flex flex-col">
        <header className="text-center mb-8">
          <h1 className={`text-5xl md:text-7xl font-black mb-2 transition-colors duration-500 ${isAlert ? 'text-white' : 'text-purple-400'}`}>
            ШУМОМЕР
          </h1>
          <p className={`text-lg transition-colors duration-500 ${isAlert ? 'text-white/90' : 'text-purple-300/70'}`}>
            Мониторинг уровня шума в реальном времени
          </p>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <Card className={`w-full max-w-2xl p-8 md:p-12 transition-all duration-500 ${isAlert ? 'bg-red-700/90 border-red-500' : 'bg-purple-950/50 border-purple-700/50 backdrop-blur-sm'}`}>
            <div className="text-center mb-8">
              <div className={`text-8xl md:text-9xl font-black mb-4 transition-colors duration-500 ${isAlert ? 'text-white' : 'text-purple-400'}`}>
                {decibels}
              </div>
              <div className={`text-2xl md:text-3xl font-bold transition-colors duration-500 ${isAlert ? 'text-white/90' : 'text-purple-300'}`}>
                дБ
              </div>
            </div>

            <div className="flex gap-1 h-32 mb-8 items-end justify-center">
              {visualBars.map((height, i) => (
                <div
                  key={i}
                  className={`w-4 rounded-t transition-all duration-75 ${
                    isAlert 
                      ? 'bg-white' 
                      : decibels > threshold 
                        ? 'bg-red-500' 
                        : 'bg-gradient-to-t from-purple-600 to-purple-400'
                  }`}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>

            <div className="flex justify-center">
              {!isListening ? (
                <Button
                  onClick={startListening}
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xl px-12 py-6 rounded-full transition-all"
                >
                  <Icon name="Mic" className="mr-2" size={24} />
                  Начать измерение
                </Button>
              ) : (
                <Button
                  onClick={stopListening}
                  size="lg"
                  variant="destructive"
                  className="font-bold text-xl px-12 py-6 rounded-full"
                >
                  <Icon name="MicOff" className="mr-2" size={24} />
                  Остановить
                </Button>
              )}
            </div>
          </Card>

          <Card className={`w-full max-w-2xl p-6 transition-all duration-500 ${isAlert ? 'bg-red-700/90 border-red-500' : 'bg-purple-950/50 border-purple-700/50 backdrop-blur-sm'}`}>
            <div className="flex items-center gap-4 mb-4">
              <Icon name="Settings" className={isAlert ? 'text-white' : 'text-purple-400'} size={24} />
              <h2 className={`text-xl font-bold transition-colors duration-500 ${isAlert ? 'text-white' : 'text-purple-400'}`}>
                Порог срабатывания
              </h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className={`text-lg transition-colors duration-500 ${isAlert ? 'text-white/90' : 'text-purple-300'}`}>
                  Уровень тревоги:
                </span>
                <span className={`text-3xl font-bold transition-colors duration-500 ${isAlert ? 'text-white' : 'text-purple-400'}`}>
                  {threshold} дБ
                </span>
              </div>
              
              <Slider
                value={[threshold]}
                onValueChange={(value) => setThreshold(value[0])}
                min={10}
                max={100}
                step={1}
                className="w-full"
                disabled={isAlert}
              />
              
              <div className={`text-sm transition-colors duration-500 ${isAlert ? 'text-white/70' : 'text-purple-300/70'}`}>
                При превышении порога экран станет красным и прозвучит сигнал
              </div>
            </div>
          </Card>

          {isAlert && (
            <div className="text-center animate-pulse">
              <div className="text-3xl font-black text-white mb-2">
                ⚠️ ПРЕВЫШЕН ПОРОГ ШУМА
              </div>
              <div className="text-xl text-white/90">
                Восстановление через 5 секунд
              </div>
            </div>
          )}
        </div>

        <footer className={`text-center mt-8 transition-colors duration-500 ${isAlert ? 'text-white/70' : 'text-purple-400/50'}`}>
          <p className="text-sm">
            Минималистичный шумомер • {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
