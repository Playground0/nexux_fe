import { useState, useEffect } from 'react';
import { Client } from '@stomp/stompjs';

export function useWebSocket(url) {
  const [client, setClient] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const stompClient = new Client({
      brokerURL: url,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        setConnected(true);
        console.log('Connected to WebSocket');
      },
      onDisconnect: () => {
        setConnected(false);
        console.log('Disconnected from WebSocket');
      },
      // for sockjs, use webSocketFactory if standard websocket is not supported
      // webSocketFactory: () => new SockJS('http://localhost:8080/ws')
    });

    stompClient.activate();
    setClient(stompClient);

    return () => {
      stompClient.deactivate();
    };
  }, [url]);

  return { client, connected };
}
