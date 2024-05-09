import React, {useEffect, useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import socketService from '../socketServer';
import RNFS from 'react-native-fs';
import base64 from 'react-native-base64';

const audioRecorderPlayer = new AudioRecorderPlayer();

const Recorder = () => {
  const [recordTime, setRecordTime] = useState('00:00');
  const [playTime, setPlayTime] = useState('00:00');
  const [duration, setDuration] = useState('00:00');
  const [receivedAudio, setReceivedAudio] = useState('');

  const onStartRecord = async () => {
    try {
      await audioRecorderPlayer.startRecorder();
    } catch (error) {
      console.log('Error starting recorder:', error);
    }
  };

  const onStopRecord = async () => {
    try {
      const audioFile = await audioRecorderPlayer.stopRecorder();
      const arrayBufferAudio = await convertMp4ToArrayBuffer(audioFile);
      const base64Audio = base64.encodeFromByteArray(
        new Uint8Array(arrayBufferAudio),
      );
      const dataToSend = {
        data: base64Audio,
        type: 'audio_input',
      };
      // socketService.emit('open', {dataToSend});
      socketService.sendAudio(dataToSend);
      // const path = `${RNFS.DocumentDirectoryPath}/audio.aac`;
      // // Write the Base64 string to a file
      // RNFS.writeFile(path, audio, 'base64')
      //   .then(() => {
      //     // Play the audio file
      //     audioRecorderPlayer
      //       .startPlayer(path)
      //       .then(() => {
      //         console.log('Audio started playing');
      //       })
      //       .catch(err => {
      //         console.log('Error playing audio:', err);
      //       });
      //   })
      //   .catch(err => {
      //     console.error('Error writing file:', err);
      //   });
    } catch (error) {
      console.log('Error stopping recorder:', error);
    }
  };

  const convertMp4ToArrayBuffer = async audioFilePath => {
    try {
      const binaryData = await RNFS.readFile(audioFilePath, 'base64');
      const binaryArray = Uint8Array.from(base64.decode(binaryData), c =>
        c.charCodeAt(0),
      );
      return binaryArray.buffer;
    } catch (error) {
      console.error('Error converting MP4 to ArrayBuffer:', error);
      return null;
    }
  };

  const onStartPlay = async () => {
    try {
      await audioRecorderPlayer.startPlayer();
    } catch (error) {
      console.log('Error starting playback:', error);
    }
  };

  const onPausePlay = async () => {
    try {
      await audioRecorderPlayer.pausePlayer();
    } catch (error) {
      console.log('Error pausing playback:', error);
    }
  };

  const onStopPlay = async () => {
    try {
      await audioRecorderPlayer.stopPlayer();
    } catch (error) {
      console.log('Error stopping playback:', error);
    }
  };

  useEffect(() => {
    // Existing setup for record and playback listeners
    audioRecorderPlayer.addRecordBackListener(e =>
      setRecordTime(audioRecorderPlayer.mmssss(Math.floor(e.currentPosition))),
    );
    audioRecorderPlayer.addPlayBackListener(e => {
      setPlayTime(audioRecorderPlayer.mmssss(Math.floor(e.currentPosition)));
      setDuration(audioRecorderPlayer.mmssss(Math.floor(e.duration)));
    });

    // Listen to WebSocket events
    socketService.on('open', () => console.log('WebSocket connection opened'));
    socketService.on('close', (code, reason) =>
      console.log(
        `WebSocket connection closed with code ${code} and reason ${reason}`,
      ),
    );
    socketService.on('error', error =>
      console.error('WebSocket error:', error),
    );

    // Listen to the 'message' event and process the received audio data
    socketService.on('message', message => {
      console.log('WebSocket message received:', message);
      // Assuming the message is a JSON string containing audio data
      const audioData = JSON.parse(message);
      if (audioData.type === 'audio_output') {
        // Convert Base64 audio data to a format that can be played back
        const path = `${RNFS.DocumentDirectoryPath}/received_audio.aac`;
        RNFS.writeFile(path, audioData.data, 'base64')
          .then(() => {
            // Play the received audio file
            audioRecorderPlayer
              .startPlayer(path)
              .then(() => console.log('Received audio started playing'))
              .catch(err => console.log('Error playing received audio:', err));
          })
          .catch(err =>
            console.error('Error writing received audio file:', err),
          );
      }
    });

    // Cleanup function
    return () => {
      audioRecorderPlayer.removeRecordBackListener();
      audioRecorderPlayer.removePlayBackListener();
      // socketService.closeConnection();
    };
  }, []);

  useEffect(() => {
    const handleAssistantEnd = message => {
      console.log('Assistant session ended:', message);
    };

    const handleAssistantMessage = message => {
      console.log('Assistant message:', message);
    };

    const handleAudioOutput = message => {
      console.log('Audio output:', message);
    };

    const handleError = message => {
      console.error('Error message:', message);
    };

    // Subscribe to message types
    socketService.on('assistant_end', handleAssistantEnd);
    socketService.on('assistant_message', handleAssistantMessage);
    socketService.on('audio_output', handleAudioOutput);
    socketService.on('error', handleError);

    // return () => {
    //   // Clean up listeners
    //   socketService.off('assistant_end', handleAssistantEnd);
    //   socketService.off('assistant_message', handleAssistantMessage);
    //   socketService.off('audio_output', handleAudioOutput);
    //   socketService.off('error', handleError);
    // };
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
