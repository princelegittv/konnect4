import { useEffect, useRef } from "react";
import { playPieceDropSound, primeGameAudio } from "../audio/gameSounds";

function getMoveKey(room) {
  const move = room?.gameState?.lastMove;
  if (!room?.code || !move) {
    return "";
  }

  return `${room.code}:${move.row}:${move.column}:${move.color}`;
}

export function useGameSoundEffects(room) {
  const lastMoveKeyRef = useRef("");
  const lastRoomCodeRef = useRef("");

  useEffect(() => {
    function unlockAudio() {
      void primeGameAudio().catch(() => {});
    }

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (!room?.code) {
      lastMoveKeyRef.current = "";
      lastRoomCodeRef.current = "";
      return;
    }

    const nextMoveKey = getMoveKey(room);
    const roomChanged = lastRoomCodeRef.current !== room.code;

    if (roomChanged) {
      lastRoomCodeRef.current = room.code;
      lastMoveKeyRef.current = nextMoveKey;
      return;
    }

    const previousMoveKey = lastMoveKeyRef.current;
    if (nextMoveKey && nextMoveKey !== previousMoveKey) {
      playPieceDropSound(room.gameState.lastMove.color);
    }

    lastMoveKeyRef.current = nextMoveKey;
  }, [
    room?.code,
    room?.gameState?.lastMove?.row,
    room?.gameState?.lastMove?.column,
    room?.gameState?.lastMove?.color,
  ]);
}
