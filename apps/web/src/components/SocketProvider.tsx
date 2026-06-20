"use client";
import { API_URL } from '@/lib/api';

import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

// The context holds our socket connection
const SocketContext = createContext<Socket | null>(null);

// A custom hook so components can easily grab the socket
export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { status } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Only connect if the user is fully logged in
    if (status !== "authenticated") return;

    // Connect to the Express server
    const socketInstance = io(API_URL, {
      withCredentials: true, // This sends the NextAuth cookie to the backend security middleware!
    });

    socketInstance.on("connect", () => {
      console.log("🟢 Connected to WebSocket Server!");
    });

    socketInstance.on("connect_error", (err) => {
      console.error("🔴 WebSocket Connection Error:", err.message);
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(socketInstance);

    // Cleanup: Disconnect when the user logs out or leaves the app
    return () => {
      socketInstance.disconnect();
    };
  }, [status]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};