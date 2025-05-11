/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Tool, SchemaType } from "@google/generative-ai";
import {
  MultimodalLiveAPIClientConnection,
  MultimodalLiveClient,
} from "../lib/multimodal-live-client";
import { LiveConfig } from "../multimodal-live-types";
import { AudioStreamer } from "../lib/audio-streamer";
import { audioContext } from "../lib/utils";
import VolMeterWorket from "../lib/worklets/vol-meter";

export type UseLiveAPIResults = {
  client: MultimodalLiveClient;
  setConfig: (config: LiveConfig) => void;
  config: LiveConfig;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  volume: number;
};

export function useLiveAPI({
  url,
  apiKey,
}: MultimodalLiveAPIClientConnection): UseLiveAPIResults {
  const client = useMemo(
    () => new MultimodalLiveClient({ url, apiKey }),
    [url, apiKey],
  );
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const [connected, setConnected] = useState(false);

  // Danh sách các trang trong app để build system instruction
  const availablePagesForAI = [
    { pageName: "Trang chủ", route: "/", description: "Trang chính của ứng dụng." },
    { pageName: "Pantry Tracker", route: "/pantry-tracker", description: "Quản lý thực phẩm trong bếp." },
    { pageName: "Chat Mobi", route: "/chat-mobi", description: "Trò chuyện với chuyên gia AI." },
    { pageName: "NutriNews", route: "/news", description: "Tin tức dinh dưỡng." },
    { pageName: "Journey", route: "/journey", description: "Theo dõi hành trình sức khỏe." },
    { pageName: "Recognize Meal", route: "/recognize-meal", description: "Nhận diện món ăn." },
    { pageName: "Profile", route: "/profile", description: "Thông tin cá nhân và sức khỏe." },
    { pageName: "Giải thích AI", route: "/ai-explainer", description: "Tìm hiểu về AI của NutriCare." },
    { pageName: "Chính sách bảo mật", route: "/policy", description: "Chính sách bảo mật và điều khoản." }
  ];

  const systemInstructionText = `
Bạn là một trợ lý AI hữu ích của NutriCare.
Ứng dụng có các trang sau: ${availablePagesForAI
    .map(p => `${p.pageName} (${p.description}, route: ${p.route})`)
    .join(", ")}.
Khi người dùng yêu cầu điều hướng, hãy sử dụng tool 'navigateToPage' với 'route' chính xác.
`.trim();

  const defaultTools: Tool[] = [
    {
      functionDeclarations: [
        {
          name: "navigateToPage",
          description:
            "Điều hướng người dùng đến một trang cụ thể trong ứng dụng. Chỉ sử dụng các route đã được cung cấp.",
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              route: {
                type: SchemaType.STRING,
                description:
                  "Đường dẫn (route) chính xác của trang muốn điều hướng.",
              },
            },
            required: ["route"],
          },
        },
        {
          name: "startScreenShare",
          description: "Bắt đầu chia sẻ màn hình của người dùng.",
          parameters: { type: SchemaType.OBJECT, properties: {} },
        },
        {
          name: "stopScreenShare",
          description: "Dừng chia sẻ màn hình của người dùng.",
          parameters: { type: SchemaType.OBJECT, properties: {} },
        },
      ],
    },
  ];

  // --- Chỉnh sửa ở đây: generationConfig đúng format ---
  const [config, setConfig] = useState<LiveConfig>({
    model: "models/gemini-2.0-flash-exp",
    tools: defaultTools,
    systemInstruction: { parts: [{ text: systemInstructionText }] },
    generationConfig: {
      // Đổi sang mảng và đánh chữ hoa đúng API
      responseModalities: "audio",
      speechConfig: {
        // Thêm languageCode để bật tiếng Việt
         languageCode: "vi-VN", // Removed for now as it's not in the type definition for speechConfig
        voiceConfig: {
          prebuiltVoiceConfig: {
            // Chọn prebuilt voice hỗ trợ tốt tiếng Việt
            voiceName: "Kore",
          },
        },
      },
    },
  });
  // -----------------------------------------------

  const [volume, setVolume] = useState(0);

  // Đăng ký audio streaming
  useEffect(() => {
    if (!audioStreamerRef.current) {
      audioContext({ id: "audio-out" }).then((audioCtx) => {
        if (audioCtx) {
          audioStreamerRef.current = new AudioStreamer(audioCtx);
          audioStreamerRef.current
            .addWorklet<any>("vumeter-out", VolMeterWorket, (ev: any) => {
              setVolume(ev.data.volume);
            })
            .catch(() => {
              console.warn("Không thêm được worklet đo volume.");
            });
        } else {
          console.warn(
            "AudioContext không thể khởi tạo, tính năng audio có thể không hoạt động."
          );
        }
      });
    }
  }, [audioStreamerRef]);

  // Event listeners từ client
  useEffect(() => {
    const onClose = () => setConnected(false);
    const stopAudio = () => audioStreamerRef.current?.stop();
    const onAudio = (data: ArrayBuffer) =>
      audioStreamerRef.current?.addPCM16(new Uint8Array(data));

    client.on("close", onClose).on("interrupted", stopAudio).on("audio", onAudio);

    return () => {
      client.off("close", onClose).off("interrupted", stopAudio).off("audio", onAudio);
    };
  }, [client]);

  // Kết nối
  const connect = useCallback(async () => {
    client.disconnect();
    await client.connect(config);
    setConnected(true);
  }, [client, config]);

  // Ngắt kết nối
  const disconnect = useCallback(async () => {
    client.disconnect();
    setConnected(false);
  }, [client]);

  return {
    client,
    config,
    setConfig,
    connected,
    connect,
    disconnect,
    volume,
  };
}
