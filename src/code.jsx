import {fetchAccessToken} from '@humeai/voice';
import {encode} from 'base-64';
import React, {useEffect} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import base64 from 'react-native-base64';

const App: React.FC = () => {
  const getToken = async () => {
    try {
      const apiKey = encode('H82rBAENxJbfGXhvA8OKaGAVA0SfbFUfxjL1WyFpiCs3xtKN');
      const clientSecret = encode(
        'IvUtGjqdKYZiVUfEfxGc4WCeTdf7pDnKNa4GINyrN88tNQtpmNNl1re8NAeOZpQC',
      );

      const authString = `${apiKey}:${clientSecret}`;
      const encoded = base64.encode(authString);

      const res = await fetch('https://api.hume.ai/oauth2-cc/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${encoded}`,
        },
      });
      console.log('🚀 ~ getToken ~ res:', JSON.stringify(res, null, 2));

      // const accessToken = await fetchAccessToken({
      //   apiKey: apiKey,
      //   clientSecret: clientSecret,

      // });
      // console.log(accessToken);
    } catch (error) {
      console.log('Error while getting access token', error);
    }
  };

  useEffect(() => {
    getToken();
  }, []);

  return (
    <View style={styles.mainContainer}>
      <Pressable style={styles.buttonContainer}>
        <Text style={styles.buttonText}>Start Conversation</Text>
      </Pressable>
    </View>
  );
};

export default App;

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    backgroundColor: 'black',
    padding: 20,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
