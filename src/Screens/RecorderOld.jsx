import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import socketService from '../socketServer';

const audioRecorderPlayer = new AudioRecorderPlayer();

const Recorder = () => {
  const [recordSecs, setRecordSecs] = useState(0);
  const [recordTime, setRecordTime] = useState('00:00');
  const [currentPositionSec, setCurrentPositionSec] = useState(0);
  const [currentDurationSec, setCurrentDurationSec] = useState(0);
  const [playTime, setPlayTime] = useState('00:00');
  const [duration, setDuration] = useState('00:00');

  useEffect(() => {
    audioRecorderPlayer.addRecordBackListener(e => {
      setRecordSecs(e.currentPosition);
      setRecordTime(audioRecorderPlayer.mmssss(Math.floor(e.currentPosition)));
    });

    audioRecorderPlayer.addPlayBackListener(e => {
      setCurrentPositionSec(e.currentPosition);
      setCurrentDurationSec(e.duration);
      setPlayTime(audioRecorderPlayer.mmssss(Math.floor(e.currentPosition)));
      setDuration(audioRecorderPlayer.mmssss(Math.floor(e.duration)));
    });

    return () => {
      audioRecorderPlayer.removeRecordBackListener();
      audioRecorderPlayer.removePlayBackListener();
    };
  }, []);

  const onStartRecord = async () => {
    try {
      const result = await audioRecorderPlayer.startRecorder();
      console.log(result);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const onStopRecord = async () => {
    try {
      const result = await audioRecorderPlayer.stopRecorder();
      console.log(result);
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const onStartPlay = async () => {
    try {
      console.log('onStartPlay');
      const msg = await audioRecorderPlayer.startPlayer();
      console.log(msg);
    } catch (error) {
      console.error('Error starting playback:', error);
    }
  };

  const onPausePlay = async () => {
    try {
      await audioRecorderPlayer.pausePlayer();
    } catch (error) {
      console.error('Error pausing playback:', error);
    }
  };

  const onStopPlay = async () => {
    try {
      console.log('onStopPlay');
      audioRecorderPlayer.stopPlayer();
    } catch (error) {
      console.error('Error stopping playback:', error);
    }
  };

  useEffect(() => {
    socketService.on('open', data => {
      console.log('WebSocket connection opened', data);
    });
    socketService.on('error', error => {
      console.error('WebSocket error:', error);
    });
    socketService.on('close', (code, reason) => {
      console.log(
        `WebSocket connection closed with code ${code} and reason ${reason}`,
      );
    });
    socketService.on('message', message => {
      console.log(message);
    });
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={onStartRecord}>
        <Text style={styles.buttonText}>Start Recording</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onStopRecord}>
        <Text style={styles.buttonText}>Stop Recording</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onStartPlay}>
        <Text style={styles.buttonText}>Start Playback</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onPausePlay}>
        <Text style={styles.buttonText}>Pause Playback</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onStopPlay}>
        <Text style={styles.buttonText}>Stop Playback</Text>
      </TouchableOpacity>

      <Text>Record Time: {recordTime}</Text>
      <Text>Play Time: {playTime}</Text>
      <Text>Duration: {duration}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Recorder;
