import React, {useState, useEffect} from 'react';
import {View, Button, Text} from 'react-native';
import {
  base64ToBlob,
  getAudioStream,
  checkForAudioTracks,
  getSupportedMimeType,
  createSocketConfig,
  VoiceClient,
} from '@humeai/voice';
import base64 from 'react-native-base64';
import io from 'socket.io-client';
import {VoiceProvider} from '@humeai/voice-react';
import socketService from '../socketServer';

const Home = () => {
  const [accessToken, setAccessToken] = useState('');
  const [client, setClient] = useState(null);
  const [audioStream, setAudioStream] = useState(null);
  const [recorder, setRecorder] = useState(null);
  const [audioQueue, setAudioQueue] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    authenticate();
  }, []);

  const authenticate = async () => {
    try {
      const apiKey = 'H82rBAENxJbfGXhvA8OKaGAVA0SfbFUfxjL1WyFpiCs3xtKN';
      const clientSecret =
        'IvUtGjqdKYZiVUfEfxGc4WCeTdf7pDnKNa4GINyrN88tNQtpmNNl1re8NAeOZpQC';
      const authString = `${apiKey}:${clientSecret}`;
      const encoded = base64.encode(authString);

      const res = await fetch('https://api.hume.ai/oauth2-cc/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${encoded}`,
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
        }).toString(),
      });
      const data = await res.json();
      console.log('🚀 ~ authenticate ~ data:', data);
      const accessToken = data.access_token;
      console.log('🚀 ~ authenticate ~ accessToken:', accessToken);
      setAccessToken(accessToken);
      console.log('Authenicated Successfully');

      //   // define EVI configuration

      //   const config = createSocketConfig({
      //     auth: {type: 'accessToken', value: accessToken},
      //     debug: true,
      //   });

      //   // instantiate client with configuration
      //   const client = VoiceClient.create(config);
      //   console.log('🚀 ~ authenticate ~ client:', client);

      const ws = new WebSocket(
        'wss://api.hume.ai/v0/evi/chat?access_token=' + accessToken,
      );
      ws.onopen = function () {
        console.log('WebSocket connection established successfully!');
        let data = {
          data: 'Can we start the conversation',
          type: 'audio_input',
        };
        ws.send(data);

        ws.send('can we start');
      };

      ws.onmessage = msg => {
        console.log('received', msg);
      };
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const connect = async () => {
    try {
      if (!accessToken) {
        console.error('Access token not available.');
        return;
      }

      const mimeType = getSupportedMimeType().mimeType;

      const socket = io('https://api.hume.ai', {
        query: {
          access_token: accessToken,
        },
        transports: ['websocket'],
      });
      console.log('====================================');
      console.log('socket', socket);
      console.log('====================================');

      socket.on('connect', async () => {
        console.log('Web socket connection opened');
        await captureAudio();
      });

      socket.on('audio_output', async audioOutput => {
        const blob = base64ToBlob(audioOutput, mimeType);
        setAudioQueue(prevQueue => [...prevQueue, blob]);
        if (!isPlaying) {
          await playAudio();
        }
      });

      socket.on('user_interruption', () => {
        stopAudio();
      });

      socket.on('error', error => {
        console.error('Socket error:', error);
      });

      socket.on('disconnect', () => {
        console.log('Web socket connection closed');
      });

      setClient(socket);
    } catch (error) {
      console.error('Error while connecting:', error);
    }
  };

  const captureAudio = async () => {
    const stream = await getAudioStream();
    setAudioStream(stream);
    checkForAudioTracks(stream);

    const newRecorder = new MediaRecorder(stream);
    newRecorder.ondataavailable = async ({data}) => {
      if (data.size > 0 && client?.connected) {
        const buffer = await data.arrayBuffer();
        client?.emit('audio_input', buffer);
      }
    };

    newRecorder.start(100);
    setRecorder(newRecorder);
  };

  const playAudio = async () => {
    if (audioQueue.length > 0 && !isPlaying) {
      setIsPlaying(true);
      const audioBlob = audioQueue.shift();
      const audioUrl = URL.createObjectURL(audioBlob);
      const newAudio = new Audio(audioUrl);
      newAudio.play();
      newAudio.onended = async () => {
        setIsPlaying(false);
        if (audioQueue.length > 0) {
          await playAudio();
        }
      };
    }
  };

  const stopAudio = () => {
    setIsPlaying(false);
    setAudioQueue([]);
    recorder?.stop();
    setRecorder(null);
    audioStream?.getTracks().forEach(track => track.stop());
    setAudioStream(null);
  };

  const disconnect = () => {
    client?.disconnect();
  };

  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <Button title="Authenticate" onPress={authenticate} />
      <Button title="Connect" onPress={connect} />
      <Button title="Disconnect" onPress={disconnect} />
    </View>
  );
};

export default Home;
