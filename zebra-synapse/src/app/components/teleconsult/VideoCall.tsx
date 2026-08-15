import { useEffect, useRef, useState, useCallback } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Loader2,
  MonitorUp,
  MonitorOff,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  ShieldCheck,
  Radio,
  Clock,
  Sparkles,
  Info,
} from "lucide-react";
import { getSupabase } from "../../../lib/supabase";

interface VideoCallProps {
  consultationId: string;
  role: "DOCTOR" | "PATIENT";
  onLeave: () => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
    { urls: ["stun:stun.cloudflare.com:3478"] },
    { urls: ["stun:global.stun.twilio.com:3478"] },
  ],
  iceCandidatePoolSize: 10,
};

// Generates an animated high-fidelity canvas video stream + silent audio track
// Used when the physical camera is locked by another window/tab or unavailable
function createSimulatedStream(role: "DOCTOR" | "PATIENT"): { stream: MediaStream; cleanup: () => void } {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");
  let animId: number;
  let frame = 0;

  const draw = () => {
    if (!ctx) return;
    frame++;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    if (role === "DOCTOR") {
      grad.addColorStop(0, "#0b0f19");
      grad.addColorStop(0.5, "#181e36");
      grad.addColorStop(1, "#272262");
    } else {
      grad.addColorStop(0, "#06130d");
      grad.addColorStop(0.5, "#0b291b");
      grad.addColorStop(1, "#12422b");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle grid dots pattern
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    for (let x = 20; x < canvas.width; x += 30) {
      for (let y = 20; y < canvas.height; y += 30) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Pulsing outer aura ring
    const pulse = (Math.sin(frame * 0.05) + 1) * 0.5;
    const radius = 64 + pulse * 12;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2 - 25, radius + 20, 0, Math.PI * 2);
    ctx.fillStyle =
      role === "DOCTOR"
        ? `rgba(99, 102, 241, ${0.12 + pulse * 0.15})`
        : `rgba(16, 185, 129, ${0.12 + pulse * 0.15})`;
    ctx.fill();

    // Inner avatar circle
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2 - 25, radius, 0, Math.PI * 2);
    ctx.fillStyle = role === "DOCTOR" ? "#3E36B0" : "#15803d";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = role === "DOCTOR" ? "#A8DEF7" : "#86efac";
    ctx.stroke();

    // User Avatar Initials
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 34px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(role === "DOCTOR" ? "DR" : "PT", canvas.width / 2, canvas.height / 2 - 25);

    // Feed Title
    ctx.font = "bold 17px sans-serif";
    ctx.fillStyle = "#f8fafc";
    ctx.fillText(
      role === "DOCTOR" ? "Dr. Amelia Hart (Virtual Video Feed)" : "Patient Feed (Active Teleconsult)",
      canvas.width / 2,
      canvas.height / 2 + 75
    );

    // Status subtitle
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Encrypted P2P HD Telehealth Stream", canvas.width / 2, canvas.height / 2 + 98);

    // Waveform simulation bars at bottom
    const barCount = 18;
    const barWidth = 6;
    const barGap = 6;
    const startX = (canvas.width - barCount * (barWidth + barGap)) / 2;
    for (let i = 0; i < barCount; i++) {
      const h = 8 + Math.sin(frame * 0.08 + i * 0.45) * 14 + Math.random() * 6;
      ctx.fillStyle = role === "DOCTOR" ? "#60a5fa" : "#4ade80";
      ctx.fillRect(startX + i * (barWidth + barGap), canvas.height - 35 - h, barWidth, h);
    }

    animId = requestAnimationFrame(draw);
  };

  draw();

  const videoStream = canvas.captureStream(30);

  // Generate silent audio track so WebRTC audio channel is always valid
  let audioContext: AudioContext | null = null;
  let audioTracks: MediaStreamTrack[] = [];
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioContext = new AudioCtx();
      const dest = audioContext.createMediaStreamDestination();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      gain.gain.value = 0; // complete silence
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      audioTracks = dest.stream.getAudioTracks();
    }
  } catch (err) {
    console.warn("AudioContext fallback error:", err);
  }

  const combinedStream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...audioTracks,
  ]);

  return {
    stream: combinedStream,
    cleanup: () => {
      cancelAnimationFrame(animId);
      if (audioContext) {
        audioContext.close().catch(() => {});
      }
      combinedStream.getTracks().forEach((t) => t.stop());
    },
  };
}

export default function VideoCall({ consultationId, role, onLeave }: VideoCallProps) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [usingSimulatedCamera, setUsingSimulatedCamera] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "reconnecting" | "disconnected"
  >("connecting");
  const [callDurationSec, setCallDurationSec] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const simulatedStreamCleanupRef = useRef<(() => void) | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const supabaseChannelRef = useRef<any>(null);
  const iceCandidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const peerIdRef = useRef<string>(
    `${role}-${Math.random().toString(36).substring(2, 9)}-${Date.now().toString().slice(-4)}`
  );

  const isPolite = role === "PATIENT"; // Patient is polite peer; Doctor is impolite peer (caller)
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const isSettingRemoteAnswerPendingRef = useRef(false);
  const seqRef = useRef(0);
  const seenMessagesRef = useRef<Set<string>>(new Set());
  const remoteMediaStreamRef = useRef<MediaStream>(new MediaStream());

  // Timer for active call duration
  useEffect(() => {
    if (connectionStatus !== "connected") {
      setCallDurationSec(0);
      return;
    }
    const interval = setInterval(() => {
      setCallDurationSec((sec) => sec + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [connectionStatus]);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Bind remote stream to video element
  useEffect(() => {
    const videoEl = remoteVideoRef.current;
    if (videoEl && remoteStream) {
      if (videoEl.srcObject !== remoteStream) {
        videoEl.srcObject = remoteStream;
      }
      const p = videoEl.play();
      if (p !== undefined) {
        p.catch((err) => {
          if (err.name !== "AbortError") {
            console.warn("Remote autoplay waiting for user interaction:", err);
          }
        });
      }
    }
  }, [remoteStream]);

  // Bind local stream to PIP video element
  useEffect(() => {
    const videoEl = localVideoRef.current;
    if (videoEl && localStreamRef.current) {
      if (videoEl.srcObject !== localStreamRef.current) {
        videoEl.srcObject = localStreamRef.current;
      }
      const p = videoEl.play();
      if (p !== undefined) {
        p.catch((err) => {
          if (err.name !== "AbortError") {
            console.warn("Local play error:", err);
          }
        });
      }
    }
  }, [localStreamRef.current, usingSimulatedCamera]);

  // Multi-transport signal dispatcher with message deduplication ID
  const sendSignal = useCallback(
    (signal: { type: string; [key: string]: any }) => {
      seqRef.current += 1;
      const msgId = `${peerIdRef.current}_${Date.now()}_${seqRef.current}_${Math.random().toString(36).substring(2, 7)}`;
      const payload = {
        ...signal,
        msgId,
        senderPeerId: peerIdRef.current,
        senderRole: role,
        consultationId,
        timestamp: Date.now(),
      };

      // 1. BroadcastChannel (instant zero-latency cross-tab communication)
      try {
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage(payload);
        }
      } catch (err) {
        console.warn("BroadcastChannel send error:", err);
      }

      // 2. Supabase Realtime Broadcast (remote / cross-network communication)
      try {
        if (supabaseChannelRef.current) {
          void supabaseChannelRef.current.send({
            type: "broadcast",
            event: "webrtc-signal",
            payload,
          });
        }
      } catch (err) {
        console.warn("Supabase signal send error:", err);
      }

      // 3. LocalStorage fallback for maximum cross-tab resilience
      try {
        localStorage.setItem(
          `zebra_rtc_sig_${consultationId}`,
          JSON.stringify({ ...payload, _nonce: Math.random() })
        );
      } catch {
        // ignore storage errors
      }
    },
    [consultationId, role]
  );

  // Initialize WebRTC & Multi-tier Media Streams
  useEffect(() => {
    let isMounted = true;

    async function initCall() {
      // 1. Acquire Media Stream with Graceful Fallback
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch (err) {
        console.warn(
          "Direct camera/mic access unavailable (possibly occupied by another tab). Generating virtual avatar stream fallback:",
          err
        );
        const sim = createSimulatedStream(role);
        stream = sim.stream;
        simulatedStreamCleanupRef.current = sim.cleanup;
        if (isMounted) setUsingSimulatedCamera(true);
      }

      if (!isMounted) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // 2. Create RTCPeerConnection
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      // Add local audio and video tracks to PeerConnection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle incoming remote media tracks (accumulate stably in remoteMediaStream)
      pc.ontrack = (event) => {
        console.log("Received remote track:", event.track.kind);
        const remoteMS = remoteMediaStreamRef.current;
        if (event.streams && event.streams[0]) {
          event.streams[0].getTracks().forEach((track) => {
            if (!remoteMS.getTracks().some((t) => t.id === track.id)) {
              remoteMS.addTrack(track);
            }
          });
        } else if (event.track) {
          if (!remoteMS.getTracks().some((t) => t.id === event.track.id)) {
            remoteMS.addTrack(event.track);
          }
        }
        setRemoteStream(remoteMS);
        setConnectionStatus("connected");
      };

      // Handle ICE Candidate generation
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({
            type: "ice-candidate",
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // Monitor connection state
      pc.oniceconnectionstatechange = () => {
        console.log("ICE Connection State:", pc.iceConnectionState);
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          setConnectionStatus("connected");
        } else if (pc.iceConnectionState === "disconnected") {
          setConnectionStatus("reconnecting");
        } else if (pc.iceConnectionState === "failed") {
          setConnectionStatus("reconnecting");
          // Attempt ICE restart
          void (async () => {
            try {
              makingOfferRef.current = true;
              const offer = await pc.createOffer({ iceRestart: true });
              await pc.setLocalDescription(offer);
              sendSignal({ type: "offer", sdp: pc.localDescription });
            } catch (e) {
              console.warn("ICE restart failed:", e);
            } finally {
              makingOfferRef.current = false;
            }
          })();
        }
      };

      // Perfect Negotiation: onnegotiationneeded triggers local offer creation cleanly
      pc.onnegotiationneeded = async () => {
        try {
          makingOfferRef.current = true;
          console.log("Negotiation needed: creating WebRTC offer...");
          await pc.setLocalDescription();
          sendSignal({ type: "offer", sdp: pc.localDescription });
        } catch (err) {
          console.error("Negotiation needed error:", err);
        } finally {
          makingOfferRef.current = false;
        }
      };

      // Flush buffered ICE candidates once remote description is set
      const flushIceCandidates = async () => {
        if (!pc.remoteDescription) return;
        while (iceCandidatesQueueRef.current.length > 0) {
          const candidate = iceCandidatesQueueRef.current.shift();
          if (candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.warn("Error adding queued ICE candidate:", err);
            }
          }
        }
      };

      // Signal Handler for incoming offers, answers, candidates, and presence with Perfect Negotiation
      const handleSignalMessage = async (msg: any) => {
        if (!msg || msg.senderPeerId === peerIdRef.current) return;
        if (msg.consultationId && msg.consultationId !== consultationId) return;

        // Deduplicate messages received across multiple transports (BroadcastChannel, Supabase, localStorage)
        if (msg.msgId) {
          if (seenMessagesRef.current.has(msg.msgId)) return;
          seenMessagesRef.current.add(msg.msgId);
          if (seenMessagesRef.current.size > 300) {
            const first = seenMessagesRef.current.values().next().value;
            if (first) seenMessagesRef.current.delete(first);
          }
        }

        try {
          if (msg.type === "peer-ready") {
            console.log("Peer ready received from:", msg.senderRole);
            // Reply with ack
            sendSignal({ type: "peer-ready-ack" });

            // Impolite peer (Doctor) initiates offer when peer is ready if currently stable
            if (!isPolite && pc.signalingState === "stable") {
              try {
                makingOfferRef.current = true;
                console.log("Doctor creating offer after receiving peer-ready...");
                await pc.setLocalDescription();
                sendSignal({ type: "offer", sdp: pc.localDescription });
              } catch (err) {
                console.warn("Failed to create offer on peer-ready:", err);
              } finally {
                makingOfferRef.current = false;
              }
            }
          } else if (msg.type === "peer-ready-ack") {
            console.log("Peer ready ack received from:", msg.senderRole);
            // Impolite peer (Doctor) initiates offer if in stable
            if (!isPolite && pc.signalingState === "stable") {
              try {
                makingOfferRef.current = true;
                console.log("Doctor creating offer after receiving peer-ready-ack...");
                await pc.setLocalDescription();
                sendSignal({ type: "offer", sdp: pc.localDescription });
              } catch (err) {
                console.warn("Failed to create offer on peer-ready-ack:", err);
              } finally {
                makingOfferRef.current = false;
              }
            }
          } else if (msg.type === "offer" && msg.sdp) {
            console.log("Received WebRTC Offer from:", msg.senderRole);
            const readyForOffer =
              !makingOfferRef.current &&
              (pc.signalingState === "stable" || isSettingRemoteAnswerPendingRef.current);
            const offerCollision = !readyForOffer;

            ignoreOfferRef.current = !isPolite && offerCollision;
            if (ignoreOfferRef.current) {
              console.log("Glare collision: impolite peer ignoring incoming offer");
              return;
            }

            if (offerCollision) {
              console.log("Glare collision: polite peer rolling back local description");
              await pc.setLocalDescription({ type: "rollback" });
            }

            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            await flushIceCandidates();

            await pc.setLocalDescription();
            sendSignal({ type: "answer", sdp: pc.localDescription });
          } else if (msg.type === "answer" && msg.sdp) {
            console.log("Received WebRTC Answer from:", msg.senderRole);
            if (pc.signalingState === "have-local-offer") {
              isSettingRemoteAnswerPendingRef.current = true;
              await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
              isSettingRemoteAnswerPendingRef.current = false;
              await flushIceCandidates();
            } else {
              console.warn("Ignoring answer received in unexpected state:", pc.signalingState);
            }
          } else if (msg.type === "ice-candidate" && msg.candidate) {
            try {
              if (pc.remoteDescription && pc.remoteDescription.type) {
                await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
              } else {
                iceCandidatesQueueRef.current.push(msg.candidate);
              }
            } catch (err) {
              if (!ignoreOfferRef.current) {
                console.warn("Failed to add ICE candidate:", err);
              }
            }
          } else if (msg.type === "peer-leave") {
            console.log("Remote peer left the call.");
            remoteMediaStreamRef.current = new MediaStream();
            setRemoteStream(null);
            setConnectionStatus("disconnected");
          }
        } catch (err) {
          console.error("Error processing WebRTC signal message:", err);
        }
      };

      // 3. Setup BroadcastChannel for Instant Local Signaling
      let bc: BroadcastChannel | null = null;
      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          bc = new BroadcastChannel(`zebra-teleconsult-rtc-${consultationId}`);
          broadcastChannelRef.current = bc;
          bc.onmessage = (event) => {
            void handleSignalMessage(event.data);
          };
        }
      } catch (err) {
        console.warn("BroadcastChannel initialization error:", err);
      }

      // 4. Setup Supabase Realtime Broadcast Signaling
      const sb = getSupabase();
      let sbChannel: any = null;
      if (sb) {
        sbChannel = sb.channel(`zebra-teleconsult-rtc-${consultationId}`, {
          config: { broadcast: { self: false } },
        });
        supabaseChannelRef.current = sbChannel;

        sbChannel.on("broadcast", { event: "webrtc-signal" }, (event: any) => {
          void handleSignalMessage(event.payload);
        });

        sbChannel.subscribe((status: string) => {
          if (status === "SUBSCRIBED") {
            // Announce presence once subscribed
            sendSignal({ type: "peer-ready" });
          }
        });
      }

      // 5. Setup LocalStorage Storage Listener for Fallback
      const handleStorageSignal = (e: StorageEvent) => {
        if (e.key === `zebra_rtc_sig_${consultationId}` && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            void handleSignalMessage(data);
          } catch {}
        }
      };
      window.addEventListener("storage", handleStorageSignal);

      // 6. Broadcast initial readiness signal immediately
      sendSignal({ type: "peer-ready" });

      // 7. Periodic ping to ensure connection if peer joins shortly after (stops once connected)
      const pingInterval = setInterval(() => {
        if (
          pc.iceConnectionState !== "connected" &&
          pc.iceConnectionState !== "completed" &&
          pc.connectionState !== "connected"
        ) {
          sendSignal({ type: "peer-ready" });
        }
      }, 3000);

      // Cleanup
      return () => {
        clearInterval(pingInterval);
        window.removeEventListener("storage", handleStorageSignal);
        if (bc) bc.close();
        if (sbChannel && sb) void sb.removeChannel(sbChannel);
      };
    }

    let cleanupPromise: Promise<(() => void) | undefined> | undefined;
    cleanupPromise = initCall().then((cleanup) => cleanup);

    return () => {
      isMounted = false;
      sendSignal({ type: "peer-leave" });

      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
      }

      if (simulatedStreamCleanupRef.current) {
        simulatedStreamCleanupRef.current();
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      if (pcRef.current) {
        pcRef.current.close();
      }

      remoteMediaStreamRef.current = new MediaStream();

      cleanupPromise?.then((cleanup) => {
        if (cleanup) cleanup();
      });
    };
  }, [consultationId, role, sendSignal, isPolite]);

  // Controls
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextState = !audioTracks[0].enabled;
        audioTracks.forEach((t) => (t.enabled = nextState));
        setIsMuted(!nextState);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const nextState = !videoTracks[0].enabled;
        videoTracks.forEach((t) => (t.enabled = nextState));
        setIsVideoOff(!nextState);
      }
    }
  };

  const toggleSpeaker = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !remoteVideoRef.current.muted;
      setIsSpeakerMuted(remoteVideoRef.current.muted);
    }
  };

  const toggleScreenShare = async () => {
    if (!pcRef.current || !localStreamRef.current) return;

    if (isScreenSharing) {
      // Stop Screen Share -> Revert to camera
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }
      const cameraTrack = localStreamRef.current.getVideoTracks()[0];
      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
      if (sender && cameraTrack) {
        await sender.replaceTrack(cameraTrack);
      }
      setIsScreenSharing(false);
    } else {
      // Start Screen Share
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = displayStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
          void toggleScreenShare();
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.warn("Screen sharing cancelled or unavailable:", err);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleHangup = () => {
    sendSignal({ type: "peer-leave" });
    if (pcRef.current) pcRef.current.close();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (simulatedStreamCleanupRef.current) {
      simulatedStreamCleanupRef.current();
    }
    onLeave();
  };

  return (
    <div
      ref={containerRef}
      className={`w-full ${
        isFullscreen ? "h-screen" : "h-[620px]"
      } bg-[#060813] rounded-[28px] border border-cyan-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_30px_rgba(56,189,248,0.18)] overflow-hidden relative group flex items-center justify-center backdrop-blur-2xl transition-all duration-300`}
    >
      {/* Remote Video Stream (Main viewport) */}
      {remoteStream ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="text-slate-100 flex flex-col items-center p-6 text-center z-10 max-w-lg">
          <div className="relative mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_30px_rgba(56,189,248,0.25)]">
              <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
            </div>
            <div className="absolute inset-0 rounded-full border border-cyan-400/40 animate-ping pointer-events-none" />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/60 px-3.5 py-1 text-xs font-semibold text-cyan-300 mb-3 backdrop-blur-md">
            <Radio className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
            <span>Consultation Session Room #{consultationId}</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 font-['Manrope']">
            {role === "DOCTOR" ? "Waiting for Patient to connect..." : "Connecting to Doctor's Room..."}
          </h3>

          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md">
            {role === "DOCTOR"
              ? "The consultation session is active and broadcasting. As soon as the patient opens their teleconsultation link, the live encrypted HD video feed will display automatically."
              : "Connecting securely to your healthcare specialist via WebRTC peer-to-peer encryption. Your consultation video will begin shortly."}
          </p>

          <div className="mt-5 flex items-center gap-2 text-[11px] text-slate-500 bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-slate-800">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>End-to-End Encrypted Peer-to-Peer Telehealth Stream</span>
          </div>
        </div>
      )}

      {/* Top Session Info Bar */}
      <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-20 pointer-events-none">
        <div className="flex items-center gap-2.5 bg-slate-950/80 backdrop-blur-xl border border-white/10 px-3.5 py-1.5 rounded-full pointer-events-auto shadow-md">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              connectionStatus === "connected"
                ? "bg-emerald-400 shadow-[0_0_10px_#34d399]"
                : "bg-amber-400 animate-pulse"
            }`}
          />
          <span className="text-xs font-bold text-slate-200">
            {connectionStatus === "connected" ? "Live HD Stream" : "Connecting Room"}
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-[11px] font-mono text-cyan-300 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {connectionStatus === "connected" ? formatDuration(callDurationSec) : "00:00"}
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {usingSimulatedCamera && (
            <div
              className="flex items-center gap-1.5 bg-indigo-950/80 backdrop-blur-xl border border-indigo-500/30 text-indigo-200 text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-md"
              title="Physical webcam is occupied by another browser tab on this machine. Using high-fidelity virtual stream."
            >
              <Sparkles className="h-3 w-3 text-indigo-400" />
              <span>Virtual Camera Feed</span>
            </div>
          )}

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-950/80 backdrop-blur-xl border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer hover:bg-slate-900"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Picture-in-Picture Local Video (Bottom Right) */}
      <div className="absolute bottom-20 right-5 w-52 h-36 bg-slate-950/90 rounded-2xl overflow-hidden border border-cyan-500/40 shadow-[0_12px_30px_rgba(0,0,0,0.85)] z-20 transition-all duration-300 hover:scale-105 group/pip">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isVideoOff ? "hidden" : "block"}`}
        />
        {isVideoOff && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-500 gap-1">
            <VideoOff size={28} />
            <span className="text-[10px] font-semibold">Camera Off</span>
          </div>
        )}
        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/70 backdrop-blur-md text-[10px] font-bold text-white border border-white/10">
          You ({role === "DOCTOR" ? "Doctor" : "Patient"})
        </div>
      </div>

      {/* Controls Bar (Bottom Center) */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-3 bg-slate-950/90 backdrop-blur-2xl px-5 py-2.5 rounded-3xl border border-cyan-500/25 shadow-[0_12px_40px_rgba(0,0,0,0.85)] z-20 transition-all duration-300">
        {/* Microphone Mute */}
        <button
          type="button"
          onClick={toggleMute}
          className={`p-3 rounded-2xl transition-all cursor-pointer ${
            isMuted
              ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30"
              : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20"
          }`}
          title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
        >
          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        {/* Video Camera Toggle */}
        <button
          type="button"
          onClick={toggleVideo}
          className={`p-3 rounded-2xl transition-all cursor-pointer ${
            isVideoOff
              ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30"
              : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20"
          }`}
          title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
        >
          {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
        </button>

        {/* Screen Share */}
        <button
          type="button"
          onClick={toggleScreenShare}
          className={`p-3 rounded-2xl transition-all cursor-pointer ${
            isScreenSharing
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30"
              : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20"
          }`}
          title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
        >
          {isScreenSharing ? <MonitorOff size={18} /> : <MonitorUp size={18} />}
        </button>

        {/* Speaker Volume */}
        <button
          type="button"
          onClick={toggleSpeaker}
          className={`p-3 rounded-2xl transition-all cursor-pointer ${
            isSpeakerMuted
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30"
              : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20"
          }`}
          title={isSpeakerMuted ? "Unmute Speaker" : "Mute Speaker"}
        >
          {isSpeakerMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        <div className="w-px h-7 bg-slate-800 mx-0.5" />

        {/* Hangup / End Call */}
        <button
          type="button"
          onClick={handleHangup}
          className="p-3 bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-2xl hover:from-rose-500 hover:to-red-500 transition-all cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.4)]"
          title="End Teleconsultation"
        >
          <PhoneOff size={18} />
        </button>
      </div>
    </div>
  );
}
