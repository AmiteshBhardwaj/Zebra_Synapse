import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2 } from "lucide-react";
import type PeerType from "peerjs";
import type { MediaConnection } from "peerjs";

interface VideoCallProps {
  consultationId: string;
  role: "DOCTOR" | "PATIENT";
  onLeave: () => void;
}

export default function VideoCall({ consultationId, role, onLeave }: VideoCallProps) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  const peerRef = useRef<PeerType | null>(null);
  const connectionRef = useRef<MediaConnection | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const docId = `teleconsult-doc-${consultationId}`;
  const patId = `teleconsult-pat-${consultationId}`;
  const myId = role === "DOCTOR" ? docId : patId;
  const targetId = role === "DOCTOR" ? patId : docId;

  // Bind remote stream to video element when available
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch((e) => {
        console.error("Autoplay prevented:", e);
      });
    }
  }, [remoteStream]);

  useEffect(() => {
    let mounted = true;
    
    async function setupMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Dynamically import PeerJS for browser compatibility
        const { default: Peer } = await import("peerjs");
        
        const peer = new Peer(myId, {
          debug: 1,
          config: {
            iceServers: [
              { urls: "stun:stun.l.google.com:19302" },
              { urls: "stun:stun1.l.google.com:19302" },
            ],
          },
        });
        
        peerRef.current = peer;

        peer.on("open", (id) => {
          console.log("My Peer ID is:", id);
          if (role === "PATIENT") {
            connectToTarget(peer, stream);
          }
        });

        peer.on("call", (call) => {
          console.log("Receiving call from:", call.peer);
          call.answer(stream);
          connectionRef.current = call;
          
          call.on("stream", (remoteMediaStream) => {
            console.log("Received remote stream");
            setRemoteStream(remoteMediaStream);
          });
          
          call.on("close", () => {
             onLeave();
          });
        });
        
        peer.on("error", (err) => {
          console.error("PeerJS error:", err);
          if (err.type === "peer-unavailable" && role === "PATIENT") {
            console.log("Doctor not connected yet, retrying in 3 seconds...");
            retryTimeoutRef.current = setTimeout(() => {
              if (mounted) connectToTarget(peer, stream);
            }, 3000);
          }
        });

      } catch (err) {
        console.error("Failed to get local camera/mic stream", err);
      }
    }

    setupMedia();

    return () => {
      mounted = false;
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (connectionRef.current) connectionRef.current.close();
      if (peerRef.current) peerRef.current.destroy();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [myId, role]);

  const connectToTarget = (peer: PeerType, stream: MediaStream) => {
    console.log("Calling target:", targetId);
    const call = peer.call(targetId, stream);
    connectionRef.current = call;
    
    call.on("stream", (remoteMediaStream) => {
      console.log("Received remote stream");
      setRemoteStream(remoteMediaStream);
    });
    
    call.on("close", () => {
      onLeave();
    });
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleHangup = () => {
    if (connectionRef.current) connectionRef.current.close();
    if (peerRef.current) peerRef.current.destroy();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    onLeave();
  };

  return (
    <div className="w-full h-[600px] bg-[#060813]/90 rounded-[28px] border border-cyan-500/25 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(56,189,248,0.15)] overflow-hidden relative group flex items-center justify-center backdrop-blur-2xl">
      {/* Remote Video (Main) */}
      {remoteStream ? (
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="text-slate-100 flex flex-col items-center p-6 text-center z-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_25px_rgba(56,189,248,0.2)] mb-6">
            <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            {role === "DOCTOR" ? "Waiting for Patient to join..." : "Connecting to Doctor..."}
          </h3>
          <p className="text-sm text-slate-400 max-w-sm">
            {role === "DOCTOR" 
              ? "The consultation session is active. Once the patient connects, video stream will display automatically." 
              : "Connecting securely to your healthcare provider. Please ensure your camera and microphone permissions are granted."}
          </p>
        </div>
      )}

      {/* Local Video (PIP) */}
      <div className="absolute bottom-6 right-6 w-56 h-36 bg-slate-950/80 rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[0_10px_25px_rgba(0,0,0,0.7)] z-20 transition-all duration-300 hover:scale-105">
        <video 
          ref={localVideoRef} 
          autoPlay 
          playsInline 
          muted 
          className={`w-full h-full object-cover ${isVideoOff ? "hidden" : "block"}`}
        />
        {isVideoOff && (
          <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-500">
            <VideoOff size={32} />
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-950/85 backdrop-blur-2xl px-6 py-3.5 rounded-3xl border border-cyan-500/20 shadow-[0_10px_35px_rgba(0,0,0,0.8)] z-20 transition-all duration-300 group-hover:scale-105">
        <button 
          type="button"
          onClick={toggleMute}
          className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
            isMuted 
              ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30" 
              : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20"
          }`}
          title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        
        <button 
          type="button"
          onClick={toggleVideo}
          className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
            isVideoOff 
              ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30" 
              : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20"
          }`}
          title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
        >
          {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>

        <div className="w-px h-8 bg-slate-800 mx-1"></div>
        
        <button 
          type="button"
          onClick={handleHangup}
          className="p-3.5 bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-2xl hover:from-rose-500 hover:to-red-500 transition-all cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.4)]"
          title="End Teleconsultation"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
}
