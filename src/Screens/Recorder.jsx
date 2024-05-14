import React, {useEffect, useState} from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import base64 from 'react-native-base64';
import RNFS from 'react-native-fs';
import socketService from '../socketServer';
import {useNavigation} from '@react-navigation/native';

const audioRecorderPlayer = new AudioRecorderPlayer();

const Recorder = () => {
  const [messages, setMessages] = useState([]);
  const [isAudioStarted, setIsAudioStarted] = useState(false);
  // Add a state to keep track of the current audio file path
  const [currentAudioPath, setCurrentAudioPath] = useState('');
  const navigation = useNavigation();
  const onStartRecord = async () => {
    try {
      setIsAudioStarted(true);
      await audioRecorderPlayer.startRecorder();
    } catch (error) {
      console.log('Error starting recorder:', error);
    }
  };

  const onStopRecord = async () => {
    try {
      setIsAudioStarted(false);
      const audioFile = await audioRecorderPlayer.stopRecorder();
      const arrayBufferAudio = await convertMp4ToArrayBuffer(audioFile);
      const base64Audio = base64.encodeFromByteArray(
        new Uint8Array(arrayBufferAudio),
      );
      const dataToSend = {
        data: base64Audio,
        type: 'audio_input',
      };
      socketService.sendAudio(dataToSend);
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

  const handleBack = () => {
    navigation.goBack();
  };

  useEffect(() => {
    // Listen to WebSocket events
    socketService.on('open', () => console.log('WebSocket connection opened'));
    socketService.on('close', (code, reason) => {
      console.log(
        `WebSocket connection closed with code ${code} and reason ${reason}`,
      );
    });
    socketService.on('error', error =>
      console.error('WebSocket error:', error),
    );

    // Listen to the 'message' event and process the received audio data
    socketService.on('message', message => {
      console.log('WebSocket message received:', message);
      // Assuming the message is a JSON string containing audio data
      const audioData = JSON.parse(message);
      if (audioData.type === 'audio_output') {
        console.log('====================================');
        console.log('NEXT INCOMING AUDIO');
        console.log('====================================');
        const path = `${
          RNFS.DocumentDirectoryPath
        }/received_audio_${Date.now()}.aac`; // Use a unique file name
        setCurrentAudioPath(path); // Update the current audio file path
        RNFS.writeFile(path, audioData.data, 'base64')
          .then(() => {
            // Stop any ongoing playback before starting a new one
            audioRecorderPlayer
              .stopPlayer()
              .then(() => {
                // Start playing the new audio file
                audioRecorderPlayer
                  .startPlayer(path)
                  .then(() => console.log('Received audio started playing'))
                  .catch(err =>
                    console.log('Error playing received audio:', err),
                  );
              })
              .catch(err => console.log('Error stopping player:', err));
          })
          .catch(err =>
            console.error('Error writing received audio file:', err),
          );
      } else if (audioData.type === 'assistant_message') {
        // Update messages state with the new message
        setMessages(prevMessages => [
          ...prevMessages,
          {role: 'assistant', content: audioData.message.content},
        ]);
      } else if (audioData.type === 'user_message') {
        // Update messages state with the new message
        setMessages(prevMessages => [
          ...prevMessages,
          {role: 'user', content: audioData?.message?.content},
        ]);
      } else if (audioData.type === 'assistant_message') {
        // Update messages state with the new message
        setMessages(prevMessages => [
          ...prevMessages,
          {role: 'assistant', content: audioData.message.content},
        ]);
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
  }, []);

  return (
    <View style={styles.container}>
      <Pressable style={styles.backButton} onPress={handleBack}>
        <Image
          source={require('../images/backIcon.png')}
          style={styles.backIcon}
        />
      </Pressable>
      <ScrollView style={styles.messagesContainer}>
        {messages.map((message, index) => (
          <View
            key={index}
            style={[
              styles.message,
              message.role === 'assistant'
                ? styles.assistantMessage
                : styles.userMessage,
            ]}>
            <Text style={styles.messageText}>{message?.content}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.buttonContainer}>
        {!isAudioStarted ? (
          <Pressable style={styles.button} onPress={onStartRecord}>
            <Text style={styles.buttonText}>Ask me Anything</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.button} onPress={onStopRecord}>
            <Text style={styles.buttonText}>Stop</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    padding: 20,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  message: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 5,
  },
  messageText: {
    fontSize: 16,
  },
  button: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    backgroundColor: 'black',
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  userMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
  },
  assistantMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#e0e0ff',
  },
  backIcon: {
    height: 30,
    width: 30,
  },
  backButton: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 30,
    width: 30,
    borderWidth: 2,
    borderColor: 'black',
    borderRadius: 50,
    padding: 20,
    backgroundColor: 'black',
  },
});

export default Recorder;
