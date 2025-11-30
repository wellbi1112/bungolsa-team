import React, { useState } from "react";
import "./App.css";

type Player = {
  id: number;
  name: string;
  handicap?: number;
};

type Team = Player[];

type Mode = "random" | "balanced";

// 팀 이름 후보들
const TEAM_NAME_PRESETS = [
  "이글방",
  "버디방",
  "알바트로스방",
  "드로우방",
  "페이드방",
  "롱아이언방",
  "벙커탈출방",
  "티샷신방",
  "온그린방",
  "원온도전방",
];

// 공용 셔플 함수
function shuffle<T>(arr: T[]): T[] {
  return arr
    .map((v) => ({ v, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.v);
}

// 팀 이름 개수만큼 랜덤으로 뽑기
function generateTeamNames(count: number): string[] {
  const shuffledNames = shuffle(TEAM_NAME_PRESETS);
  const names: string[] = [];

  for (let i = 0; i < count; i++) {
    if (i < shuffledNames.length) {
      names.push(shuffledNames[i]);
    } else {
      names.push(`방/팀 ${i + 1}`);
    }
  }
  return names;
}

function parsePlayers(text: string): Player[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return lines.map((line, idx) => {
    const [nameRaw, handicapRaw] = line.split(",").map((p) => p?.trim());
    const name = nameRaw || `참가자${idx + 1}`;
    const handicap =
      handicapRaw && !Number.isNaN(Number(handicapRaw))
        ? Number(handicapRaw)
        : undefined;

    return {
      id: idx + 1,
      name,
      handicap,
    };
  });
